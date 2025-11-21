"use server";

import { db } from "@/lib/db";
import { chatLogs, type NewChatLogParams } from "@/lib/db/schema";
import { desc, lt, eq, sql } from "drizzle-orm";

export async function createChatLog(log: NewChatLogParams) {
  await db.insert(chatLogs).values(log);
}

/**
 * Get chat logs with pagination
 * @param limit Maximum number of logs to return (default: 100, max: 1000)
 * @param offset Number of records to skip (default: 0)
 */
export async function getChatLogs(limit: number = 100, offset: number = 0) {
  // Enforce reasonable limits to prevent memory issues
  const safeLimit = Math.min(Math.max(1, limit), 1000);
  const safeOffset = Math.max(0, offset);

  return db
    .select()
    .from(chatLogs)
    .orderBy(desc(chatLogs.createdAt))
    .limit(safeLimit)
    .offset(safeOffset);
}

/**
 * Get chat logs with cursor-based pagination (more efficient for large datasets)
 * @param limit Maximum number of logs to return
 * @param cursor ID of the last item from previous page (for pagination)
 */
export async function getChatLogsCursor(limit: number = 100, cursor?: string) {
  const safeLimit = Math.min(Math.max(1, limit), 1000);

  if (cursor) {
    // Get the timestamp of the cursor item
    const cursorItem = await db
      .select({ createdAt: chatLogs.createdAt })
      .from(chatLogs)
      .where(eq(chatLogs.id, cursor))
      .limit(1);

    if (cursorItem.length === 0) {
      // Invalid cursor, return empty result
      return [];
    }

    // Fetch items older than cursor
    return db
      .select()
      .from(chatLogs)
      .where(lt(chatLogs.createdAt, cursorItem[0].createdAt))
      .orderBy(desc(chatLogs.createdAt))
      .limit(safeLimit);
  }

  // First page
  return db
    .select()
    .from(chatLogs)
    .orderBy(desc(chatLogs.createdAt))
    .limit(safeLimit);
}

/**
 * Get all chat logs - USE WITH CAUTION!
 * This can cause memory issues with large datasets.
 * Consider using getChatLogs() with pagination instead.
 * @deprecated Use getChatLogs() with pagination instead
 */
export async function getAllChatLogs() {
  console.warn(
    "getAllChatLogs() is deprecated and can cause memory issues. Use getChatLogs() with pagination instead."
  );
  return db.select().from(chatLogs).orderBy(desc(chatLogs.createdAt));
}

/**
 * Get chat logs by user ID with pagination
 * @param userId User ID to filter by
 * @param limit Maximum number of logs to return
 * @param offset Number of records to skip
 */
export async function getChatLogsByUser(
  userId: string,
  limit: number = 100,
  offset: number = 0
) {
  const safeLimit = Math.min(Math.max(1, limit), 1000);
  const safeOffset = Math.max(0, offset);

  return db
    .select()
    .from(chatLogs)
    .where(eq(chatLogs.userId, userId))
    .orderBy(desc(chatLogs.createdAt))
    .limit(safeLimit)
    .offset(safeOffset);
}

/**
 * Get total count of chat logs (useful for pagination)
 */
export async function getChatLogsCount() {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatLogs);

  return result[0]?.count || 0;
}
