import { db } from "../lib/db";
import { admins } from "../lib/db/schema";
import { hashPassword } from "../lib/auth";
import { eq } from "drizzle-orm";

async function createAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error("Usage: npm run create-admin <username> <password>");
    process.exit(1);
  }

  try {
    // Check if admin already exists
    const existing = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username))
      .limit(1);

    if (existing.length > 0) {
      console.error(`Admin with username "${username}" already exists`);
      process.exit(1);
    }

    // Create admin
    const hashedPassword = await hashPassword(password);
    await db.insert(admins).values({
      username,
      password: hashedPassword,
    });

    console.log(`Admin user "${username}" created successfully!`);
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
}

createAdmin();
