import { sql } from "drizzle-orm";
import { text, varchar, timestamp, pgTable } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { nanoid } from "@/lib/utils";

export const resources = pgTable("resources", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  content: text("content").notNull(),

  // Metadata para melhor contexto e filtragem
  title: text("title"), // Ex: "Lei nº 1234/2020"
  documentType: varchar("document_type", { length: 100 }), // Ex: "lei", "decreto", "portaria"
  sourceUrl: text("source_url"), // URL oficial do documento

  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`now()`),
});

// Schema for resources - used to validate API requests
export const insertResourceSchema = createSelectSchema(resources)
  .extend({
    title: z.string().optional(),
    documentType: z.string().optional(),
    sourceUrl: z.string().url().optional().or(z.literal('')),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Type for resources - used to type API request params and within Components
export type NewResourceParams = z.infer<typeof insertResourceSchema>;
