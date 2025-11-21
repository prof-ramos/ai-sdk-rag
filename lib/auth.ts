import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env.mjs";

/**
 * JWT secret key loaded from environment variables.
 * Validated at runtime to allow builds without secrets set.
 */
const JWT_SECRET = env.JWT_SECRET;

/**
 * List of known insecure JWT secret values that should be rejected.
 * These are common placeholder or test values that pose security risks.
 */
const INSECURE_SECRETS = [
  "placeholder-jwt-secret-min-32-chars-long",
  "test-secret-min-32-chars-long-for-testing",
  "development-secret-change-in-production",
];

/**
 * Cached encoded secret key to avoid re-encoding on every call.
 * @type {Uint8Array | null}
 */
let cachedSecretKey: Uint8Array | null = null;

/**
 * Validates and encodes the JWT secret key for use with jose library.
 * Performs runtime security checks to prevent common vulnerabilities.
 * Result is cached to avoid re-encoding on subsequent calls.
 *
 * @returns {Uint8Array} Encoded secret key for JWT operations
 * @throws {Error} If JWT_SECRET is missing, too short, or uses a known insecure value
 *
 * @example
 * const key = getSecretKey(); // Used internally by createToken and verifyToken
 */
function getSecretKey(): Uint8Array {
  // Return cached key if already validated and encoded
  if (cachedSecretKey) {
    return cachedSecretKey;
  }
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

  // Cache the encoded key for future calls
  cachedSecretKey = new TextEncoder().encode(JWT_SECRET);
  return cachedSecretKey;
}

/**
 * JWT payload structure for authenticated admin sessions.
 */
export interface JWTPayload {
  /** Unique identifier for the admin user */
  adminId: string;
  /** Admin username */
  username: string;
  /** Additional custom claims */
  [key: string]: unknown;
}

/**
 * Hashes a password using bcrypt with 10 salt rounds.
 *
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Bcrypt hashed password
 *
 * @example
 * const hashed = await hashPassword("mySecurePassword123");
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verifies a password against a bcrypt hash using constant-time comparison.
 *
 * @param {string} password - Plain text password to verify
 * @param {string} hashedPassword - Bcrypt hash to compare against
 * @returns {Promise<boolean>} True if password matches, false otherwise
 *
 * @example
 * const isValid = await verifyPassword("myPassword", hashedPassword);
 * if (isValid) {
 *   // Authentication successful
 * }
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Creates a signed JWT token for admin authentication.
 * Token is valid for 24 hours and uses HS256 algorithm.
 *
 * @param {JWTPayload} payload - Admin user data to encode in the token
 * @returns {Promise<string>} Signed JWT token
 * @throws {Error} If JWT_SECRET is invalid or missing
 *
 * @example
 * const token = await createToken({
 *   adminId: "123",
 *   username: "admin"
 * });
 */
export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecretKey());
}

/**
 * Verifies and decodes a JWT token.
 * Returns null if the token is invalid, expired, or malformed.
 *
 * @param {string} token - JWT token to verify
 * @returns {Promise<JWTPayload | null>} Decoded payload if valid, null otherwise
 *
 * @example
 * const payload = await verifyToken(token);
 * if (payload) {
 *   console.log(`Authenticated as ${payload.username}`);
 * }
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Retrieves the current admin session from cookies.
 * Extracts and verifies the admin-token cookie.
 *
 * @returns {Promise<JWTPayload | null>} Current session payload if authenticated, null otherwise
 *
 * @example
 * const session = await getSession();
 * if (session) {
 *   console.log(`Logged in as ${session.username}`);
 * }
 */
export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin-token")?.value;

  if (!token) return null;

  return verifyToken(token);
}

/**
 * Middleware function that requires admin authentication.
 * Throws an error if the user is not authenticated.
 *
 * @returns {Promise<JWTPayload>} Current admin session payload
 * @throws {Error} If no valid session exists (Unauthorized)
 *
 * @example
 * // In an API route
 * export async function GET() {
 *   const admin = await requireAdmin(); // Throws if not authenticated
 *   return Response.json({ adminId: admin.adminId });
 * }
 */
export async function requireAdmin(): Promise<JWTPayload> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}
