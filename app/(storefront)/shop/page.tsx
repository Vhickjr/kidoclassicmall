import Link from "next/link";
import type { Metadata } from "next";
import { getPrisma } from "@/lib/prisma";
import ProductCard, { toProductCard } from "@/app/_components/product-card";

export const metadata: Metadata = {
  title: "Shop",
};

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const { category } = await searchParams;
  const activeSlug = typeof category === "string" ? category : null;
  const prisma = getPrisma();

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: {
        status: "PUBLISHED",
        ...(activeSlug ? { category: { slug: activeSlug } } : {}),
      },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>

      {categories.length > 0 && (
        <nav className="mt-6 flex flex-wrap gap-2">
          <FilterPill href="/shop" label="All" active={activeSlug === null} />
          {categories.map((item) => (
            <FilterPill
              key={item.id}
              href={`/shop?category=${item.slug}`}
              label={item.name}
              active={activeSlug === item.slug}
            />
          ))}
        </nav>
      )}

      {products.length === 0 ? (
        <p className="py-20 text-center text-muted">
          Nothing here yet. Published products will show up on this page.
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={toProductCard(product)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterPill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-line text-muted hover:border-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
