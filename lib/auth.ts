import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env.mjs";

// JWT_SECRET is validated at runtime to allow builds without secrets
const JWT_SECRET = env.JWT_SECRET;

// Known insecure values that should be rejected
const INSECURE_SECRETS = [
  "placeholder-jwt-secret-min-32-chars-long",
  "test-secret-min-32-chars-long-for-testing",
  "development-secret-change-in-production",
];

// Validate JWT_SECRET when actually using it (runtime check)
function getSecretKey(): Uint8Array {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
      "SECURITY ERROR: JWT_SECRET environment variable is required but not set. " +
      "The application cannot start without a secure JWT secret. " +
      "Set JWT_SECRET in your .env.local file to a cryptographically secure random string (minimum 32 characters)."
    );
  }

  // Reject known insecure placeholder values
  if (INSECURE_SECRETS.includes(JWT_SECRET)) {
    throw new Error(
      "SECURITY ERROR: JWT_SECRET is set to a known insecure placeholder value. " +
      "This is a critical security vulnerability that allows token forgery. " +
      "Generate a secure random secret: openssl rand -base64 32"
    );
  }

  return new TextEncoder().encode(JWT_SECRET);
}

export interface JWTPayload {
  adminId: string;
  username: string;
  [key: string]: unknown;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin-token")?.value;

  if (!token) return null;

  return verifyToken(token);
}

export async function requireAdmin(): Promise<JWTPayload> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}
