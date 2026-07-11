/**
 * admin-auth.ts  ──  SERVER ONLY
 *
 * This file must NEVER be imported by any client component.
 * The ADMIN_UID env var is not prefixed with NEXT_PUBLIC_, so
 * Next.js guarantees it is never bundled into the browser.
 *
 * Auth flow:
 *  1. Admin enters their Firebase UID + password on the login page.
 *  2. The login page POSTs the credentials to /api/admin/login.
 *  3. The API route verifies the UID against ADMIN_UID (server env)
 *     and verifies the password via Firebase Admin SDK / REST API.
 *  4. On success, a signed session token is stored in an HttpOnly
 *     cookie (inaccessible to JavaScript on the page).
 *  5. Every protected admin request calls /api/admin/session to
 *     verify the cookie — the browser never sees the raw UID.
 */

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

// ── Environment variables (server-only, never sent to the browser) ────────────
const ADMIN_UID = process.env.ADMIN_UID!;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET!;
const SESSION_COOKIE = "riii_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

if (!ADMIN_UID || !SESSION_SECRET) {
  // This will surface as a build/startup error so you notice immediately.
  console.error(
    "[admin-auth] ADMIN_UID or ADMIN_SESSION_SECRET is not set in environment variables."
  );
}

// ── Token helpers ─────────────────────────────────────────────────────────────

/** Returns true iff the supplied uid exactly matches the admin UID. */
export function isAdminUid(uid: string): boolean {
  try {
    const a = Buffer.from(uid);
    const b = Buffer.from(ADMIN_UID);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b); // constant-time compare — prevents timing attacks
  } catch {
    return false;
  }
}

/** Creates a signed session token: `expiry.uid` signed with HMAC-SHA256. */
export function createSessionToken(uid: string): string {
  const expiry = Date.now() + SESSION_TTL_MS;
  const payload = `${expiry}.${uid}`;
  const sig = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/** Verifies a session token. Returns the uid if valid, null otherwise. */
export function verifySessionToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return null;

    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);

    // Re-compute expected signature
    const expected = createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("hex");

    // Timing-safe signature comparison
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

    // Check expiry
    const [expiryStr, uid] = payload.split(".");
    if (!expiryStr || !uid) return null;
    if (Date.now() > parseInt(expiryStr, 10)) return null;

    // Confirm uid still matches admin uid
    if (!isAdminUid(uid)) return null;

    return uid;
  } catch {
    return null;
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

/** Reads and validates the admin session cookie. Returns uid or null. */
export async function getAdminSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Builds the Set-Cookie header value for a new admin session. */
export function buildSessionCookieHeader(uid: string): string {
  const token = createSessionToken(uid);
  const maxAge = SESSION_TTL_MS / 1000;
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}; Secure`;
}

/** Builds the Set-Cookie header value that clears the admin session. */
export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0; Secure`;
}
