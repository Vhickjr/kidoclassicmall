import "server-only";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";
import {
  BASE_CURRENCY,
  CURRENCY_COOKIE,
  type DisplayCurrency,
} from "@/lib/currency";
import { refreshRatesIfNeeded } from "@/lib/rates";

export async function listCurrencies(): Promise<DisplayCurrency[]> {
  // Automatically refresh live rates if stale (>1 hour old or missing)
  await refreshRatesIfNeeded();

  const rows = await getPrisma().currency.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
  });

  // Naira is always offered; the stored rows are the extras alongside it.
  return [
    BASE_CURRENCY,
    ...rows.map((row) => ({
      code: row.code,
      symbol: row.symbol,
      name: row.name,
      unitsPerNaira: row.unitsPerNaira,
    })),
  ];
}

export async function activeCurrency(): Promise<DisplayCurrency> {
  const jar = await cookies();
  const code = jar.get(CURRENCY_COOKIE)?.value;

  if (!code || code === BASE_CURRENCY.code) return BASE_CURRENCY;

  // Automatically refresh live rates if stale (>1 hour old or missing)
  await refreshRatesIfNeeded();

  const row = await getPrisma().currency.findUnique({ where: { code } });

  // An unknown or switched-off currency falls back rather than erroring.
  if (!row || !row.active) return BASE_CURRENCY;

  return {
    code: row.code,
    symbol: row.symbol,
    name: row.name,
    unitsPerNaira: row.unitsPerNaira,
  };
}
