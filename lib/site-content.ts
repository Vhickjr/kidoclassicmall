import "server-only";
import { getPrisma } from "@/lib/prisma";

export type ValuePropRow = { icon: string; title: string; body: string };

/** Shown until the admin saves its own set, so a fresh install is never blank. */
export const DEFAULT_VALUE_PROPS: ValuePropRow[] = [
  { icon: "truck", title: "Free Shipping", body: "Free shipping on orders above ₦150,000" },
  { icon: "badge", title: "Money Guarantee", body: "Within 30 days for an exchange" },
  { icon: "headphones", title: "Online Support", body: "24 hours a day, 7 days a week" },
  { icon: "card", title: "Flexible Payment", body: "Pay with multiple cards and transfers" },
];

export async function valueProps(): Promise<ValuePropRow[]> {
  const rows = await getPrisma().valueProp.findMany({
    where: { active: true },
    orderBy: { position: "asc" },
  });

  if (rows.length === 0) return DEFAULT_VALUE_PROPS;
  return rows.map((r) => ({ icon: r.icon, title: r.title, body: r.body }));
}

export type FooterColumns = {
  information: { label: string; href: string }[];
  service: { label: string; href: string }[];
};

/** Every default points somewhere that exists, so no footer link is a dead end. */
export const DEFAULT_FOOTER: FooterColumns = {
  information: [
    { label: "My Account", href: "/account" },
    { label: "My Orders", href: "/account/orders" },
    { label: "My Cart", href: "/cart" },
    { label: "My Wishlist", href: "/account/wishlist" },
    { label: "Checkout", href: "/checkout" },
  ],
  service: [
    { label: "About Us", href: "/our-story" },
    { label: "Blog", href: "/blog" },
    { label: "Contact Us", href: "/contact" },
    { label: "Shop", href: "/shop" },
  ],
};

export async function footerLinks(): Promise<FooterColumns> {
  const rows = await getPrisma().footerLink.findMany({
    where: { active: true },
    orderBy: { position: "asc" },
  });

  if (rows.length === 0) return DEFAULT_FOOTER;

  return {
    information: rows
      .filter((r) => r.column === "information")
      .map((r) => ({ label: r.label, href: r.href })),
    service: rows
      .filter((r) => r.column === "service")
      .map((r) => ({ label: r.label, href: r.href })),
  };
}
