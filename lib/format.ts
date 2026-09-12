/** URL-safe slug from a product name. Falls back to a timestamp if the name is
 *  all punctuation or non-Latin, so we never produce an empty slug. */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `product-${Date.now()}`;
}

/** "12500.50" or "12,500" from a form field, to 1250050 kobo. Returns null if
 *  the input is not a usable amount. */
export function nairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

const LETTER_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/** Sizes must read S, M, L, XL — alphabetical order gives L, M, S, XL, XS, which
 *  looks broken to a shopper. Shoe sizes sort numerically; anything we do not
 *  recognise sorts last, alphabetically. */
export function compareSizes(a: string, b: string): number {
  const numberA = Number(a);
  const numberB = Number(b);
  if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) return numberA - numberB;

  const rankA = LETTER_SIZES.indexOf(a.trim().toUpperCase());
  const rankB = LETTER_SIZES.indexOf(b.trim().toUpperCase());
  if (rankA !== -1 && rankB !== -1) return rankA - rankB;
  if (rankA !== -1) return -1;
  if (rankB !== -1) return 1;

  return a.localeCompare(b);
}

/** Product.images is a JSON column, so the database can hand back anything.
 *  Narrow it to the ordered list of URLs the rest of the app expects. */
export function imageList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function koboToNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(kobo / 100);
}
