"use server";

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Analytics and performance monitoring functions
 * These leverage database functions for efficient data aggregation
 */

export interface ChatStatistics {
  totalChats: bigint;
  uniqueUsers: bigint;
  avgChatsPerUser: number;
  mostUsedModel: string | null;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
}

export interface ResourceStatistics {
  totalResources: bigint;
  totalEmbeddings: bigint;
  avgEmbeddingsPerResource: number;
  resourcesByType: Record<string, number>;
  oldestResource: Date | null;
  newestResource: Date | null;
}

export interface HeavyResource {
  resourceId: string;
  title: string | null;
  documentType: string | null;
  embeddingCount: bigint;
  createdAt: Date;
}

/**
 * Get chat statistics for a specific date range
 * Uses database function for efficient aggregation
 */
export async function getChatStatistics(
  startDate?: Date,
  endDate?: Date
): Promise<ChatStatistics | null> {
  try {
    const result = await db.execute(
      sql`SELECT * FROM get_chat_statistics(${startDate || null}, ${endDate || null})`
    );

    return (result[0] as unknown as ChatStatistics) || null;
  } catch (error) {
    console.error("Error fetching chat statistics:", error);
    return null;
  }
}

/**
 * Get resource and embedding statistics
 * Uses database function for efficient aggregation
 */
export async function getResourceStatistics(): Promise<ResourceStatistics | null> {
  try {
    const result = await db.execute(
      sql`SELECT * FROM get_resource_statistics()`
    );

    return (result[0] as unknown as ResourceStatistics) || null;
  } catch (error) {
    console.error("Error fetching resource statistics:", error);
    return null;
  }
}

/**
 * Get resources with unusually high embedding counts
 * Helps identify potential performance bottlenecks
 */
export async function getHeavyResources(
  minEmbeddingCount: number = 50
): Promise<HeavyResource[]> {
  try {
    const result = await db.execute(
      sql`SELECT * FROM get_heavy_resources(${minEmbeddingCount})`
    );

    return result as unknown as HeavyResource[];
  } catch (error) {
    console.error("Error fetching heavy resources:", error);
    return [];
  }
}

/**
 * Clean up old chat logs based on retention period
 * @param retentionDays Number of days to retain chat logs (default: 90)
 * @returns Number of deleted records
 */
export async function cleanupOldChatLogs(retentionDays: number = 90): Promise<number> {
  try {
    const result = await db.execute(
      sql`SELECT * FROM cleanup_old_chat_logs(${retentionDays})`
    );

    const row = result[0] as unknown as { deleted_count: bigint } | undefined;
    return Number(row?.deleted_count || 0);
  } catch (error) {
    console.error("Error cleaning up old chat logs:", error);
    return 0;
  }
}

/**
 * Refresh dashboard statistics materialized view
 * Should be called periodically (e.g., via cron job)
 */
export async function refreshDashboardStats(): Promise<Date | null> {
  try {
    const result = await db.execute(
      sql`SELECT refresh_dashboard_stats()`
    );

    const row = result[0] as unknown as { refresh_dashboard_stats: Date } | undefined;
    return row?.refresh_dashboard_stats || null;
  } catch (error) {
    console.error("Error refreshing dashboard stats:", error);
    return null;
  }
}

/**
 * Get dashboard statistics from materialized view
 * Much faster than computing on-the-fly
 */
export async function getDashboardStats() {
  try {
    const result = await db.execute(
      sql`SELECT * FROM mv_dashboard_stats`
    );

    return result[0] || null;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return null;
  }
}
