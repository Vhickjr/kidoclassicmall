import "server-only";
import { getPrisma } from "@/lib/prisma";

export type StoreSettingsValues = {
  deliveryFlatKobo: number;
  freeDeliveryOverKobo: number;

  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    leftImage: string | null;
    rightImage: string | null;
  };

  whatsapp: {
    enabled: boolean;
    number: string | null;
    message: string;
  };

  abandoned: {
    enabled: boolean;
    afterHours: number;
  };
};

/** Matches the schema defaults, used before the row is first written. */
export const DEFAULT_STORE_SETTINGS: StoreSettingsValues = {
  deliveryFlatKobo: 250_000,
  freeDeliveryOverKobo: 15_000_000,

  // The copy the hero shipped with, so an unedited store still reads well.
  hero: {
    eyebrow: "Classic Exclusive",
    title: "Women's Collection",
    subtitle: "Up to 40% off",
    ctaLabel: "Shop now",
    ctaHref: "/shop",
    leftImage: null,
    rightImage: null,
  },

  whatsapp: { enabled: false, number: null, message: "" },
  abandoned: { enabled: false, afterHours: 24 },
};

/**
 * Shop-wide settings. One row, created on first read, so the admin form always
 * has something to edit and checkout always has a figure to price with.
 *
 * Every text field falls back to the shipped default when blank, so clearing a
 * box in the admin restores the original copy rather than rendering an empty
 * hero.
 */
export async function storeSettings(): Promise<StoreSettingsValues> {
  const row = await getPrisma().storeSettings.findUnique({
    where: { id: "singleton" },
  });

  if (!row) return DEFAULT_STORE_SETTINGS;

  const fallback = DEFAULT_STORE_SETTINGS.hero;

  return {
    deliveryFlatKobo: row.deliveryFlatKobo,
    freeDeliveryOverKobo: row.freeDeliveryOverKobo,

    hero: {
      eyebrow: row.heroEyebrow || fallback.eyebrow,
      title: row.heroTitle || fallback.title,
      subtitle: row.heroSubtitle || fallback.subtitle,
      ctaLabel: row.heroCtaLabel || fallback.ctaLabel,
      ctaHref: row.heroCtaHref || fallback.ctaHref,
      leftImage: row.heroLeftImage || null,
      rightImage: row.heroRightImage || null,
    },

    whatsapp: {
      // The button stays hidden unless it is both switched on and has a number
      // to send to — a half-configured toggle must not ship a dead link.
      enabled: row.whatsappEnabled && Boolean(row.whatsappNumber),
      number: row.whatsappNumber || null,
      message: row.whatsappMessage || "",
    },

    abandoned: {
      enabled: row.abandonedEmailEnabled,
      afterHours: row.abandonedAfterHours,
    },
  };
}
