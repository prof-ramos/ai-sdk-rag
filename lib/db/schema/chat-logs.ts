import { sql } from "drizzle-orm";
import { text, varchar, timestamp, pgTable, jsonb } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { nanoid } from "@/lib/utils";

export const chatLogs = pgTable("chat_logs", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: varchar("user_id", { length: 191 }), // IP or session ID for anonymous users
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  context: jsonb("context"), // Store retrieved RAG context
  model: varchar("model", { length: 191 }), // Which model was used

  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
});

// Schema for chat logs - used to validate API requests
export const insertChatLogSchema = createSelectSchema(chatLogs)
  .extend({})
  .omit({
    id: true,
    createdAt: true,
  });

// Type for chat logs - used to type API request params
export type NewChatLogParams = z.infer<typeof insertChatLogSchema>;
