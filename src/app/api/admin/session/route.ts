/**
 * GET /api/admin/session
 *
 * Returns 200 { ok: true } if the admin session cookie is valid.
 * Returns 401 otherwise.
 *
 * Called by the admin layout on every page load to verify the session.
 * The client never receives the UID — only a boolean result.
 */

import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  try {
    const uid = await getAdminSession();
    if (!uid) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[/api/admin/session] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
