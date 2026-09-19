import { NextResponse } from "next/server";
import { refreshRates } from "@/lib/rates";

export async function GET(request: Request) {
  // Support optional secret key header or query param for security if CRON_SECRET is configured
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const isHeaderValid = authHeader === `Bearer ${secret}`;
    const isQueryValid = key === secret;

    if (!isHeaderValid && !isQueryValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await refreshRates();

  return NextResponse.json({
    success: !result.error,
    timestamp: new Date().toISOString(),
    ...result,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
