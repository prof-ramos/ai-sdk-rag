"use server";

import { db } from "@/lib/db";
import { chatLogs, type NewChatLogParams } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function createChatLog(log: NewChatLogParams) {
  await db.insert(chatLogs).values(log);
}

export async function getChatLogs(limit: number = 100) {
  return db.select().from(chatLogs).orderBy(desc(chatLogs.createdAt)).limit(limit);
}

export async function getAllChatLogs() {
  return db.select().from(chatLogs).orderBy(desc(chatLogs.createdAt));
}
