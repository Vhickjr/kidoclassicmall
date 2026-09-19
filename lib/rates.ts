import "server-only";
import { getPrisma } from "@/lib/prisma";

/**
 * Live exchange rates, keyless and quoted against the naira.
 *
 * The feed returns "how many units of X one naira buys", which is exactly the
 * shape stored in Currency.unitsPerNaira, so no inversion is needed.
 *
 * Rates only affect what a shopper reads — the charge is always in naira — so a
 * stale or failed refresh is a display inconvenience, never a billing error.
 */
const FEED = process.env.EXCHANGE_RATE_URL ?? "https://open.er-api.com/v6/latest/NGN";

// Default refresh threshold: 1 hour (3600000ms)
const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000;

let isRefreshing = false;
let lastCheckTime = 0;

export type RefreshResult = {
  updated: string[];
  skipped: string[];
  error?: string;
};

export async function refreshRates(): Promise<RefreshResult> {
  const prisma = getPrisma();

  // Only currencies set to follow the feed; a pinned rate is left alone.
  const currencies = await prisma.currency.findMany({ where: { autoRate: true } });

  if (currencies.length === 0) return { updated: [], skipped: [] };

  let rates: Record<string, number>;

  try {
    const response = await fetch(FEED, { cache: "no-store" });
    if (!response.ok) {
      return { updated: [], skipped: [], error: `Feed returned ${response.status}.` };
    }

    const body = await response.json();
    if (body?.result !== "success" || !body?.rates) {
      return { updated: [], skipped: [], error: "Feed returned no rates." };
    }

    rates = body.rates;
  } catch {
    return { updated: [], skipped: [], error: "Could not reach the rate feed." };
  }

  const updated: string[] = [];
  const skipped: string[] = [];

  for (const currency of currencies) {
    const rate = rates[currency.code];

    // An unknown code keeps its previous rate rather than dropping to zero.
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      skipped.push(currency.code);
      continue;
    }

    await prisma.currency.update({
      where: { id: currency.id },
      data: { unitsPerNaira: rate, rateUpdatedAt: new Date() },
    });

    updated.push(currency.code);
  }

  return { updated, skipped };
}

/**
 * Automatically triggers a rate refresh if any autoRate currency is stale
 * (older than maxAgeMs, defaulting to 1 hour, or never updated).
 * Uses in-memory throttling to prevent duplicate concurrent API hits.
 */
export async function refreshRatesIfNeeded(
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): Promise<RefreshResult | null> {
  const now = Date.now();
  // Don't re-check DB/memory more than once every 30 seconds
  if (now - lastCheckTime < 30_000 || isRefreshing) {
    return null;
  }
  lastCheckTime = now;

  try {
    const prisma = getPrisma();
    const cutoff = new Date(now - maxAgeMs);

    const staleCount = await prisma.currency.count({
      where: {
        autoRate: true,
        OR: [
          { rateUpdatedAt: null },
          { rateUpdatedAt: { lt: cutoff } },
        ],
      },
    });

    if (staleCount === 0) return null;

    isRefreshing = true;
    const result = await refreshRates();
    return result;
  } catch (err) {
    console.error("Auto currency refresh error:", err);
    return null;
  } finally {
    isRefreshing = false;
  }
}
