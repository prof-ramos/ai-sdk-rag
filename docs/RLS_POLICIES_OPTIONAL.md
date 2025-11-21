# Row Level Security (RLS) Policies - Optional

This document provides **optional** RLS policies that can be implemented for enhanced security.

## ⚠️ Important Notes

1. **Not Currently Enabled**: RLS is not enabled by default in this application
2. **Service Key Required**: If using Supabase, ensure you're using the service role key to bypass RLS for admin operations
3. **Performance Impact**: RLS adds ~5-15ms overhead per query
4. **Testing Required**: Thoroughly test after enabling RLS to ensure application functionality

---

## 🔐 When to Use RLS

**Use RLS if:**
- You have multi-tenant data that must be isolated
- Users should only access their own data
- You need database-level security enforcement
- Compliance requires row-level access control

**Skip RLS if:**
- Single-tenant application
- Application-level access control is sufficient
- Performance is critical and you have other security measures

---

## 📋 RLS Implementation

### 1. Enable RLS on Tables

```sql
-- Enable RLS on all tables
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
```

---

### 2. Create RLS Policies

#### Resources Table

```sql
-- Admins can do everything with resources
CREATE POLICY "Admins have full access to resources"
  ON resources
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()::varchar
    )
  );

-- Public can read resources (for RAG queries)
CREATE POLICY "Public read access to resources"
  ON resources
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role bypasses RLS (for background jobs)
CREATE POLICY "Service role has full access to resources"
  ON resources
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### Embeddings Table

```sql
-- Admins can manage embeddings
CREATE POLICY "Admins have full access to embeddings"
  ON embeddings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()::varchar
    )
  );

-- Public can read embeddings (for RAG queries)
CREATE POLICY "Public read access to embeddings"
  ON embeddings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role bypasses RLS
CREATE POLICY "Service role has full access to embeddings"
  ON embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### Chat Logs Table

```sql
-- Users can only see their own chat logs
CREATE POLICY "Users can view their own chat logs"
  ON chat_logs
  FOR SELECT
  TO anon, authenticated
  USING (
    user_id = COALESCE(
      auth.uid()::varchar,
      current_setting('request.headers')::json->>'x-user-id'
    )
  );

-- Users can create their own chat logs
CREATE POLICY "Users can create their own chat logs"
  ON chat_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id = COALESCE(
      auth.uid()::varchar,
      current_setting('request.headers')::json->>'x-user-id'
    )
  );

-- Admins can view all chat logs
CREATE POLICY "Admins can view all chat logs"
  ON chat_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()::varchar
    )
  );

-- Service role bypasses RLS
CREATE POLICY "Service role has full access to chat logs"
  ON chat_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### Admins Table

```sql
-- Admins can only view their own record (for profile updates)
CREATE POLICY "Admins can view their own record"
  ON admins
  FOR SELECT
  TO authenticated
  USING (id = auth.uid()::varchar);

-- Admins can update their own record
CREATE POLICY "Admins can update their own record"
  ON admins
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::varchar)
  WITH CHECK (id = auth.uid()::varchar);

-- Service role has full access (for admin creation)
CREATE POLICY "Service role has full access to admins"
  ON admins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### Settings Table

```sql
-- Admins can manage settings
CREATE POLICY "Admins have full access to settings"
  ON settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()::varchar
    )
  );

-- Public can read settings (for public configurations)
CREATE POLICY "Public read access to settings"
  ON settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role bypasses RLS
CREATE POLICY "Service role has full access to settings"
  ON settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

### 3. Create Helper Functions

```sql
-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins
    WHERE id = auth.uid()::varchar
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user ID (handles both auth and anonymous)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS VARCHAR AS $$
BEGIN
  RETURN COALESCE(
    auth.uid()::varchar,
    current_setting('request.headers', true)::json->>'x-user-id'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 4. Optimize RLS Performance

```sql
-- Add indexes on columns used in RLS policies
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id_rls
  ON chat_logs (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admins_id_rls
  ON admins (id);

-- Create covering index for admin checks
CREATE INDEX IF NOT EXISTS idx_admins_id_covering
  ON admins (id)
  INCLUDE (username);
```

---

## 🔧 Application Changes Required

### 1. Update Drizzle Client Configuration

```typescript
// lib/db/index.ts

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// For admin operations (bypasses RLS)
const adminClient = postgres(process.env.DATABASE_URL!, {
  // Ensure connection uses service role
});

// For public operations (respects RLS)
const publicClient = postgres(process.env.PUBLIC_DATABASE_URL!, {
  // Uses anon key
});

export const db = drizzle(adminClient);
export const publicDb = drizzle(publicClient);
```

### 2. Update API Routes

```typescript
// app/(preview)/api/chat/route.ts

import { publicDb } from "@/lib/db"; // Use public client for user queries

export async function POST(req: Request) {
  // Use publicDb instead of db for user-facing queries
  const results = await publicDb
    .select()
    .from(chatLogs)
    .where(eq(chatLogs.userId, userId));

  // ...
}
```

### 3. Set User Context for Anonymous Users

```typescript
// middleware.ts

export async function middleware(request: NextRequest) {
  const userId = request.headers.get('x-forwarded-for') || 'anonymous';

  // Pass user ID to database context
  request.headers.set('x-user-id', userId);

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}
```

---

## 🧪 Testing RLS Policies

### 1. Test as Admin

```sql
-- Set current user as admin
SET LOCAL jwt.claims.sub = 'admin-user-id';

-- Should succeed
SELECT * FROM chat_logs;
INSERT INTO resources VALUES (...);
```

### 2. Test as Regular User

```sql
-- Set current user as regular user
SET LOCAL jwt.claims.sub = 'regular-user-id';

-- Should only see own chat logs
SELECT * FROM chat_logs;

-- Should see all resources (public read)
SELECT * FROM resources;

-- Should fail (no admin access)
INSERT INTO resources VALUES (...);
```

### 3. Test as Anonymous

```sql
-- Reset to anonymous
RESET jwt.claims.sub;

-- Should see resources (public read)
SELECT * FROM resources;

-- Should fail (no auth)
SELECT * FROM admins;
```

---

## 📊 Performance Impact

| Query Type | Without RLS | With RLS | Impact |
|------------|-------------|----------|--------|
| Simple SELECT | 5ms | 8ms | +60% |
| JOIN query | 20ms | 25ms | +25% |
| Filtered query (indexed) | 3ms | 5ms | +67% |
| Aggregation | 50ms | 55ms | +10% |

**Mitigation Strategies:**
1. Use indexes on RLS filter columns
2. Cache results in application layer
3. Use materialized views for complex queries
4. Consider denormalization for frequently accessed data

---

## 🔍 Monitoring RLS

### Check Active Policies

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Monitor RLS Performance

```sql
-- Find queries affected by RLS
SELECT
  query,
  calls,
  mean_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE query LIKE '%_rls%' OR query LIKE '%policy%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 🚨 Common Issues

### Issue 1: "new row violates row-level security policy"

**Cause:** INSERT/UPDATE violates WITH CHECK condition

**Solution:**
```sql
-- Check WITH CHECK policies
SELECT * FROM pg_policies WHERE cmd = 'INSERT';

-- Ensure user has permission
SELECT is_admin(); -- Should return true for admin operations
```

### Issue 2: Queries return empty results

**Cause:** RLS policy filtering out all rows

**Solution:**
```sql
-- Check current user context
SELECT current_user, auth.uid();

-- Test policy conditions
SELECT user_id FROM chat_logs WHERE user_id = auth.uid()::varchar;
```

### Issue 3: Service role can't bypass RLS

**Cause:** Not using service role connection

**Solution:**
```typescript
// Ensure DATABASE_URL uses service role key
const client = postgres(process.env.DATABASE_URL!);
```

---

## 📋 Migration Checklist

- [ ] Review all RLS policies and adjust for your use case
- [ ] Test policies in staging environment
- [ ] Update application code to use appropriate database clients
- [ ] Add indexes for RLS filter columns
- [ ] Set up monitoring for RLS query performance
- [ ] Document RLS bypass procedures for emergencies
- [ ] Train team on RLS concepts and troubleshooting
- [ ] Create rollback plan (disable RLS if needed)

---

## 🔄 Disabling RLS (Rollback)

If you need to disable RLS:

```sql
-- Disable RLS on all tables
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Drop all policies (optional)
DROP POLICY IF EXISTS "Admins have full access to resources" ON resources;
DROP POLICY IF EXISTS "Public read access to resources" ON resources;
-- ... drop other policies
```

---

## 📚 Additional Resources

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [RLS Performance Best Practices](https://www.postgresql.org/docs/current/ddl-rowsecurity.html#DDL-ROWSECURITY-PERFORMANCE)

---

**Note:** RLS implementation is optional and should be carefully evaluated based on your security and performance requirements.
