/**
 * Client-safe half of the currency feature: types, the base currency and
 * formatting. Deliberately free of `next/headers` and Prisma so client
 * components can import it — the server-only lookups live in currency-server.ts.
 */
export const CURRENCY_COOKIE = "kido_currency";

export type DisplayCurrency = {
  code: string;
  symbol: string;
  name: string;
  unitsPerNaira: number;
};

/**
 * The store's own currency. Everything is priced and charged in naira; other
 * currencies are a reading convenience layered on top.
 */
export const BASE_CURRENCY: DisplayCurrency = {
  code: "NGN",
  symbol: "₦",
  name: "Nigerian Naira",
  unitsPerNaira: 1,
};

/**
 * Formats a kobo amount in the chosen currency.
 *
 * A pure function of (kobo, currency), so the server and the browser cannot
 * disagree about a price.
 */
export function formatMoney(kobo: number, currency: DisplayCurrency): string {
  const converted = (kobo / 100) * currency.unitsPerNaira;
  const isNaira = currency.code === BASE_CURRENCY.code;

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: isNaira ? 0 : 2,
      maximumFractionDigits: isNaira ? 0 : 2,
    }).format(converted);
  } catch {
    // An unrecognised ISO code should not take the page down.
    return `${currency.symbol}${converted.toFixed(2)}`;
  }
}
