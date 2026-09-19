import { NextResponse } from "next/server";
import { runAbandonedSweep } from "@/lib/abandoned";

// Talks to the database and an SMTP server, so it must never be prerendered
// or cached.
export const dynamic = "force-dynamic";

/**
 * The automatic abandoned-checkout sweep.
 *
 * Meant to be called on a schedule (Hostinger's cron: every hour is plenty,
 * since the wait is configured in hours). It is safe to call more often —
 * anything already followed up is skipped.
 *
 * Protected by CRON_SECRET, because otherwise anyone who found the URL could
 * make the shop email its customers.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not set." },
      { status: 503 }
    );
  }

  // Accepts either header style so it works with whatever the scheduler sends.
  const header = request.headers.get("authorization");
  const provided =
    header?.replace(/^Bearer /i, "") ??
    new URL(request.url).searchParams.get("key");

  if (provided !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await runAbandonedSweep();

  return NextResponse.json({ ok: true, ...result });
}
