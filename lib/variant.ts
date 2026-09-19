export type VariantWithOptions = {
  size: string;
  color?: string | null;
  customOptions?: Record<string, string> | unknown;
};

/**
 * Returns a clean display string of all variant attributes.
 * E.g. "Size: M · Color: Black · Material: Leather"
 */
export function formatVariantLabel(variant: VariantWithOptions): string {
  const parts: string[] = [];

  if (variant.size) {
    parts.push(`Size: ${variant.size}`);
  }

  if (variant.color) {
    parts.push(`Color: ${variant.color}`);
  }

  if (
    variant.customOptions &&
    typeof variant.customOptions === "object" &&
    !Array.isArray(variant.customOptions)
  ) {
    for (const [key, value] of Object.entries(
      variant.customOptions as Record<string, string>
    )) {
      if (key && value) {
        parts.push(`${key}: ${value}`);
      }
    }
  }

  return parts.join(" · ") || variant.size;
}
