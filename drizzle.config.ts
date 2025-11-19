import type { Config } from "drizzle-kit";
import { env } from "@/lib/env.mjs";

export default {
  schema: "./lib/db/schema",
  dialect: "postgresql",
  out: "./lib/db/migrations",
  dbCredentials: {
    url: env.DATABASE_URL || "postgres://placeholder:placeholder@localhost:5432/placeholder",
  }
} satisfies Config;