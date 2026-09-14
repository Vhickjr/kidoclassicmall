import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { compareSizes } from "@/lib/format";
import ProductCard, { toProductCard } from "@/app/_components/product-card";
import ShopFilters from "@/app/_components/shop-filters";
import SortSelect from "@/app/_components/sort-select";
import Breadcrumb from "@/app/_components/breadcrumb";
import ValueProps from "@/app/_components/value-props";

export const metadata: Metadata = {
  title: "Shop",
};

const PAGE_SIZE = 16;

type Queried = Awaited<ReturnType<typeof loadPublished>>[number];

function loadPublished() {
  return getPrisma().product.findMany({
    where: { status: "PUBLISHED" },
    include: { variants: true, category: true },
    orderBy: { createdAt: "desc" },
  });
}

const lowestPrice = (product: Queried) =>
  Math.min(...product.variants.map((variant) => variant.priceKobo));

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const params = await searchParams;

  const readList = (key: string) => {
    const raw = params[key];
    return typeof raw === "string" ? raw.split(",").filter(Boolean) : [];
  };

  const categoryFilter = readList("category");
  const colorFilter = readList("color");
  const sizeFilter = readList("size");
  const maxPrice =
    typeof params.maxPrice === "string" ? Number(params.maxPrice) : null;
  const sort = typeof params.sort === "string" ? params.sort : "latest";
  const page = Math.max(1, Number(params.page) || 1);

  // The whole published catalogue is read once and filtered here rather than in
  // SQL. That is deliberate: it keeps facet counts, price sorting and paging
  // consistent with one query, and a single boutique's catalogue is small. Move
  // this into SQL if the product count ever reaches the thousands.
  const published = await loadPublished();

  const categories = [
    ...new Map(
      published
        .filter((product) => product.category)
        .map((product) => [product.category!.slug, product.category!])
    ).values(),
  ]
    .map((category) => ({
      slug: category.slug,
      name: category.name,
      count: published.filter((p) => p.category?.slug === category.slug).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const facet = (pick: (product: Queried) => string[]) => {
    const counts = new Map<string, number>();
    for (const product of published) {
      for (const value of new Set(pick(product))) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    return counts;
  };

  const colors = [
    ...facet((product) =>
      product.variants.map((v) => v.color).filter((c): c is string => Boolean(c))
    ),
  ]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));

  const sizes = [...facet((product) => product.variants.map((v) => v.size))]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => compareSizes(a.value, b.value));

  const priceCeiling = Math.max(
    ...published.flatMap((product) => product.variants.map((v) => v.priceKobo))
  );

  const matches = published.filter((product) => {
    if (categoryFilter.length && !categoryFilter.includes(product.category?.slug ?? "")) {
      return false;
    }

    // One variant has to satisfy every variant-level filter at once, so asking
    // for size L in black does not match a black XL alongside a white L.
    return product.variants.some(
      (variant) =>
        (!colorFilter.length || colorFilter.includes(variant.color ?? "")) &&
        (!sizeFilter.length || sizeFilter.includes(variant.size)) &&
        (maxPrice === null || variant.priceKobo <= maxPrice)
    );
  });

  const sorted = [...matches].sort((a, b) => {
    if (sort === "price-asc") return lowestPrice(a) - lowestPrice(b);
    if (sort === "price-desc") return lowestPrice(b) - lowestPrice(a);
    if (sort === "name") return a.name.localeCompare(b.name);
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const visible = sorted.slice(start, start + PAGE_SIZE);

  const pageHref = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && key !== "page") next.set(key, value);
    }
    if (target > 1) next.set("page", String(target));
    const query = next.toString();
    return query ? `/shop?${query}` : "/shop";
  };

  return (
    <div>
      <div className="mx-auto w-full max-w-6xl px-4 pt-8">
        <Breadcrumb
          trail={[{ label: "Shop", href: "/shop" }, { label: "All Products" }]}
        />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <ShopFilters
            categories={categories}
            colors={colors}
            sizes={sizes}
            priceCeilingKobo={priceCeiling}
          />
        </aside>

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">
              {sorted.length === 0
                ? "No results"
                : `Showing ${start + 1}–${start + visible.length} of ${sorted.length} results`}
            </p>
            <SortSelect />
          </div>

          {visible.length === 0 ? (
            <p className="py-24 text-center text-muted">
              Nothing matches those filters. Try clearing one.
            </p>
          ) : (
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3">
              {visible.map((product) => (
                <li key={product.id}>
                  <ProductCard product={toProductCard(product)} />
                </li>
              ))}
            </ul>
          )}

          {pageCount > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-14 flex items-center justify-center gap-2"
            >
              {current > 1 && (
                <Link
                  href={pageHref(current - 1)}
                  aria-label="Previous page"
                  className="flex size-9 items-center justify-center text-muted hover:text-foreground"
                >
                  <ArrowLeft aria-hidden className="size-4" />
                </Link>
              )}

              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (number) => (
                  <Link
                    key={number}
                    href={pageHref(number)}
                    aria-current={number === current ? "page" : undefined}
                    className={`flex size-9 items-center justify-center border text-sm ${
                      number === current
                        ? "border-brand bg-brand text-white"
                        : "border-line hover:border-foreground"
                    }`}
                  >
                    {number}
                  </Link>
                )
              )}

              {current < pageCount && (
                <Link
                  href={pageHref(current + 1)}
                  aria-label="Next page"
                  className="flex size-9 items-center justify-center text-muted hover:text-foreground"
                >
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>

      <ValueProps />
    </div>
  );
}
