import { sql } from "drizzle-orm";
import { varchar, timestamp, pgTable } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { nanoid } from "@/lib/utils";

export const admins = pgTable("admins", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  username: varchar("username", { length: 191 }).notNull().unique(),
  password: varchar("password", { length: 191 }).notNull(), // hashed password

  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`now()`),
});

// Schema for admins - used to validate API requests
export const insertAdminSchema = createSelectSchema(admins)
  .extend({})
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Type for admins - used to type API request params
export type NewAdminParams = z.infer<typeof insertAdminSchema>;
