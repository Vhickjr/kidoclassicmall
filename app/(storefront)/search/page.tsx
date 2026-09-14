import type { Metadata } from "next";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import ProductCard, { toProductCard } from "@/app/_components/product-card";
import Breadcrumb from "@/app/_components/breadcrumb";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const results =
    query.length > 0
      ? await getPrisma().product.findMany({
          where: {
            status: "PUBLISHED",
            OR: [
              { name: { contains: query } },
              { brand: { contains: query } },
              { description: { contains: query } },
              { category: { name: { contains: query } } },
            ],
          },
          include: { variants: true },
          orderBy: { createdAt: "desc" },
          take: 48,
        })
      : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Search" }]} />

      <h1 className="mt-6 text-2xl tracking-tight">
        {query ? `Results for “${query}”` : "Search"}
      </h1>

      <form action="/search" className="mt-6 flex max-w-lg">
        <input
          name="q"
          defaultValue={query}
          placeholder="Jeans, heels, denim…"
          aria-label="Search products"
          className="min-w-0 flex-1 border border-line px-4 py-3 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="bg-brand px-6 py-3 text-sm text-white"
        >
          Search
        </button>
      </form>

      {query && results.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-muted">Nothing matched “{query}”.</p>
          <Link
            href="/shop"
            className="mt-6 inline-block bg-brand px-6 py-3 text-sm text-white"
          >
            Browse everything
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <>
          <p className="mt-8 text-sm text-muted">
            {results.length} {results.length === 1 ? "product" : "products"}
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {results.map((product) => (
              <li key={product.id}>
                <ProductCard product={toProductCard(product)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
