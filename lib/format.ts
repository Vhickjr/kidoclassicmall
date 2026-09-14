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

/** ProductVariant.color is free text, but the filters and the product page draw
 *  it as a swatch, which needs an actual colour. Anything unrecognised falls
 *  back to grey rather than rendering an invisible chip. Extend as stock needs. */
const COLOR_SWATCHES: Record<string, string> = {
  black: "#171717",
  white: "#f5f5f5",
  cream: "#efe7d7",
  grey: "#9ca3af",
  red: "#ef4444",
  burgundy: "#7f1d34",
  pink: "#ec4899",
  orange: "#f59e0b",
  yellow: "#eab308",
  green: "#65a30d",
  blue: "#3b5bdb",
  "light wash": "#9db8d2",
  "mid wash": "#5b7fa6",
  "dark wash": "#33415c",
  indigo: "#3f3d8f",
  tan: "#c08552",
  brown: "#6b4423",
};

export function colorSwatch(color: string): string {
  return COLOR_SWATCHES[color.trim().toLowerCase()] ?? "#d4d4d4";
}

export function koboToNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(kobo / 100);
}
