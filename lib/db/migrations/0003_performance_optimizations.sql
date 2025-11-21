-- Performance Optimization Migration
-- This migration adds indexes and database functions to improve query performance

-- ============================================================================
-- INDEX OPTIMIZATIONS
-- ============================================================================

-- Chat Logs Performance Indexes
-- These indexes improve query performance for admin dashboard and analytics
CREATE INDEX IF NOT EXISTS "idx_chat_logs_created_at" ON "chat_logs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_chat_logs_user_id" ON "chat_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_chat_logs_model" ON "chat_logs" ("model");

-- GIN index for JSONB context queries (enables fast JSON queries)
CREATE INDEX IF NOT EXISTS "idx_chat_logs_context" ON "chat_logs" USING gin ("context");

-- Resources Performance Indexes
-- Improves filtering and sorting by document metadata
CREATE INDEX IF NOT EXISTS "idx_resources_created_at" ON "resources" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_resources_document_type" ON "resources" ("document_type");
CREATE INDEX IF NOT EXISTS "idx_resources_updated_at" ON "resources" ("updated_at" DESC);

-- Embeddings Performance Indexes
-- Improves JOIN performance with resources table
CREATE INDEX IF NOT EXISTS "idx_embeddings_resource_id" ON "embeddings" ("resource_id");

-- Settings Performance Index (although unique constraint exists, explicit index helps)
CREATE INDEX IF NOT EXISTS "idx_settings_key" ON "settings" ("key");

-- ============================================================================
-- DATABASE FUNCTIONS FOR ANALYTICS
-- ============================================================================

-- Function: Get chat log statistics
-- Returns aggregate statistics about chat usage
CREATE OR REPLACE FUNCTION get_chat_statistics(
  start_date TIMESTAMP DEFAULT NULL,
  end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
  total_chats BIGINT,
  unique_users BIGINT,
  avg_chats_per_user NUMERIC,
  most_used_model VARCHAR,
  date_range_start TIMESTAMP,
  date_range_end TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_logs AS (
    SELECT *
    FROM chat_logs
    WHERE (start_date IS NULL OR created_at >= start_date)
      AND (end_date IS NULL OR created_at <= end_date)
  )
  SELECT
    COUNT(*)::BIGINT as total_chats,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    (COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT user_id), 0))::NUMERIC as avg_chats_per_user,
    (
      SELECT model
      FROM filtered_logs
      WHERE model IS NOT NULL
      GROUP BY model
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )::VARCHAR as most_used_model,
    COALESCE(start_date, MIN(created_at)) as date_range_start,
    COALESCE(end_date, MAX(created_at)) as date_range_end
  FROM filtered_logs;
END;
$$ LANGUAGE plpgsql;

-- Function: Get resource statistics
-- Returns aggregate statistics about resources and embeddings
CREATE OR REPLACE FUNCTION get_resource_statistics()
RETURNS TABLE (
  total_resources BIGINT,
  total_embeddings BIGINT,
  avg_embeddings_per_resource NUMERIC,
  resources_by_type JSONB,
  oldest_resource TIMESTAMP,
  newest_resource TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT r.id)::BIGINT as total_resources,
    COUNT(e.id)::BIGINT as total_embeddings,
    (COUNT(e.id)::NUMERIC / NULLIF(COUNT(DISTINCT r.id), 0))::NUMERIC as avg_embeddings_per_resource,
    (
      SELECT jsonb_object_agg(document_type, count)
      FROM (
        SELECT
          COALESCE(document_type, 'unknown') as document_type,
          COUNT(*) as count
        FROM resources
        GROUP BY document_type
      ) type_counts
    ) as resources_by_type,
    MIN(r.created_at) as oldest_resource,
    MAX(r.created_at) as newest_resource
  FROM resources r
  LEFT JOIN embeddings e ON e.resource_id = r.id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get embedding count by resource efficiently
-- Replaces N+1 query pattern with a single aggregated query
CREATE OR REPLACE FUNCTION get_resources_with_embedding_counts()
RETURNS TABLE (
  id VARCHAR,
  content TEXT,
  title TEXT,
  document_type VARCHAR,
  source_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  embedding_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.content,
    r.title,
    r.document_type,
    r.source_url,
    r.created_at,
    r.updated_at,
    COUNT(e.id)::BIGINT as embedding_count
  FROM resources r
  LEFT JOIN embeddings e ON e.resource_id = r.id
  GROUP BY r.id, r.content, r.title, r.document_type, r.source_url, r.created_at, r.updated_at
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Clean up old chat logs
-- Helps with data retention and storage optimization
CREATE OR REPLACE FUNCTION cleanup_old_chat_logs(
  retention_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  deleted_count BIGINT
) AS $$
DECLARE
  deleted BIGINT;
BEGIN
  DELETE FROM chat_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted = ROW_COUNT;

  RETURN QUERY SELECT deleted;
END;
$$ LANGUAGE plpgsql;

-- Function: Get slow query candidates (resources with many embeddings)
-- Helps identify resources that might benefit from chunking optimization
CREATE OR REPLACE FUNCTION get_heavy_resources(
  min_embedding_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  resource_id VARCHAR,
  title TEXT,
  document_type VARCHAR,
  embedding_count BIGINT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    r.document_type,
    COUNT(e.id)::BIGINT as embedding_count,
    r.created_at
  FROM resources r
  INNER JOIN embeddings e ON e.resource_id = r.id
  GROUP BY r.id, r.title, r.document_type, r.created_at
  HAVING COUNT(e.id) >= min_embedding_count
  ORDER BY COUNT(e.id) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTITIONING PREPARATION (Optional - for future use)
-- ============================================================================

-- Create function to manage chat_logs partitioning by month
-- This can be enabled later when chat_logs table grows large
-- Uncomment when needed:
/*
CREATE OR REPLACE FUNCTION create_chat_logs_partition(
  partition_date DATE
)
RETURNS VOID AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  partition_name := 'chat_logs_' || to_char(partition_date, 'YYYY_MM');
  start_date := date_trunc('month', partition_date);
  end_date := start_date + INTERVAL '1 month';

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF chat_logs
     FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    start_date,
    end_date
  );
END;
$$ LANGUAGE plpgsql;
*/

-- ============================================================================
-- MATERIALIZED VIEW FOR DASHBOARD (Optional)
-- ============================================================================

-- Create materialized view for dashboard statistics
-- Refresh this periodically (e.g., every hour) for fast dashboard loads
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_stats AS
SELECT
  -- Chat statistics
  (SELECT COUNT(*) FROM chat_logs) as total_chats,
  (SELECT COUNT(DISTINCT user_id) FROM chat_logs) as unique_users,
  (SELECT COUNT(*) FROM chat_logs WHERE created_at > NOW() - INTERVAL '24 hours') as chats_last_24h,
  (SELECT COUNT(*) FROM chat_logs WHERE created_at > NOW() - INTERVAL '7 days') as chats_last_7d,

  -- Resource statistics
  (SELECT COUNT(*) FROM resources) as total_resources,
  (SELECT COUNT(*) FROM embeddings) as total_embeddings,

  -- Latest activity
  (SELECT MAX(created_at) FROM chat_logs) as last_chat_at,
  (SELECT MAX(created_at) FROM resources) as last_resource_at,

  -- Timestamp
  NOW() as refreshed_at;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_stats_refreshed
  ON mv_dashboard_stats (refreshed_at);

-- Function to refresh dashboard stats
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS TIMESTAMP AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
  RETURN NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_chat_statistics IS 'Returns aggregate statistics about chat usage within a date range';
COMMENT ON FUNCTION get_resource_statistics IS 'Returns aggregate statistics about resources and embeddings';
COMMENT ON FUNCTION get_resources_with_embedding_counts IS 'Efficiently retrieves resources with their embedding counts (replaces N+1 queries)';
COMMENT ON FUNCTION cleanup_old_chat_logs IS 'Deletes chat logs older than specified retention period';
COMMENT ON FUNCTION get_heavy_resources IS 'Identifies resources with unusually high embedding counts';
COMMENT ON FUNCTION refresh_dashboard_stats IS 'Refreshes the materialized view for dashboard statistics';

COMMENT ON INDEX idx_chat_logs_created_at IS 'Optimizes ORDER BY created_at DESC queries';
COMMENT ON INDEX idx_chat_logs_user_id IS 'Optimizes filtering by user_id';
COMMENT ON INDEX idx_chat_logs_context IS 'Enables fast JSONB queries on context field';
COMMENT ON INDEX idx_resources_document_type IS 'Optimizes filtering by document type';
COMMENT ON INDEX idx_embeddings_resource_id IS 'Optimizes JOINs between embeddings and resources';
