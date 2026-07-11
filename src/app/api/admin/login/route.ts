/**
 * POST /api/admin/login
 *
 * Body: { idToken: string }
 *
 * Flow:
 *  1. Client signs in with Firebase Auth (email + password) — client SDK handles it.
 *  2. Client gets a short-lived Firebase ID token and sends ONLY that to this route.
 *  3. Server calls Firebase accounts:lookup to extract the UID from the token.
 *  4. Server verifies the UID against ADMIN_UID (server-only env var, never sent to browser).
 *  5. On success, sets a signed HttpOnly session cookie.
 *
 * The client NEVER receives or stores the ADMIN_UID — it only gets the cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdminUid, buildSessionCookieHeader } from "@/lib/admin-auth";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body as { idToken?: string };

    // ── 1. Validate input ─────────────────────────────────────────────────────
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }

    if (!FIREBASE_API_KEY) {
      console.error("[/api/admin/login] NEXT_PUBLIC_FIREBASE_API_KEY is not set.");
      return NextResponse.json(
        { error: "Server misconfiguration." },
        { status: 500 }
      );
    }

    // ── 2. Verify the ID token via Firebase REST API and extract the UID ──────
    // accounts:lookup returns the user info including localId (UID).
    // This is the canonical way to validate a Firebase ID token server-side
    // without the Firebase Admin SDK.
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    const lookupData = await lookupRes.json();

    if (!lookupRes.ok || lookupData.error || !lookupData.users?.[0]) {
      // Token invalid / expired
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    const uid: string = lookupData.users[0].localId;

    // ── 3. UID check (server-side, timing-safe) ───────────────────────────────
    // ADMIN_UID is a server-only env var — it is NEVER sent to the browser.

    if (!isAdminUid(uid)) {
      // Return the same generic error so attackers can't enumerate valid UIDs
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // ── 4. Issue signed HttpOnly session cookie ───────────────────────────────
    const setCookie = buildSessionCookieHeader(uid);

    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setCookie,
      },
    });
  } catch (err) {
    console.error("[/api/admin/login] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
