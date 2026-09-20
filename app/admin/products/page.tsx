import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { imageList, koboToNaira } from "@/lib/format";
import { deleteProduct, setProductStatus } from "@/app/_actions/admin";
import ConfirmSubmit from "@/app/_components/confirm-submit";

export const metadata: Metadata = { title: "Products" };

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-800",
  DRAFT: "bg-amber-100 text-amber-800",
  ARCHIVED: "bg-line text-muted",
};

const SORTS = {
  newest: { label: "Newest first", orderBy: { createdAt: "desc" as const } },
  oldest: { label: "Oldest first", orderBy: { createdAt: "asc" as const } },
  name: { label: "Name, A to Z", orderBy: { name: "asc" as const } },
  updated: { label: "Recently updated", orderBy: { updatedAt: "desc" as const } },
};

type SortKey = keyof typeof SORTS;

export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  // The gate has to sit here, not only in the layout. A layout returning early
  // does not stop its child page running, and the page's output still reaches
  // the client in the RSC payload — customer emails included.
  if (!(await requireAdmin())) return null;

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const categoryId = typeof params.category === "string" ? params.category : "";
  const stock = typeof params.stock === "string" ? params.stock : "";
  const sort: SortKey =
    typeof params.sort === "string" && params.sort in SORTS
      ? (params.sort as SortKey)
      : "newest";

  const prisma = getPrisma();

  const [all, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { brand: { contains: query } },
                { slug: { contains: query } },
              ],
            }
          : {}),
        ...(status
          ? { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" }
          : {}),
        ...(categoryId
          ? categoryId === "none"
            ? { categoryId: null }
            : { categoryId }
          : {}),
      },
      include: { variants: true, category: true },
      orderBy: SORTS[sort].orderBy,
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Stock lives across variants, so that filter is applied here rather than in SQL.
  const products = all.filter((product) => {
    if (!stock) return true;
    const total = product.variants.reduce((sum, v) => sum + v.stock, 0);
    if (stock === "out") return total === 0;
    if (stock === "low") return total > 0 && total <= 5;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-brand px-5 py-2.5 text-sm text-white"
        >
          <Plus aria-hidden className="size-4" />
          Add product
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1">
          <span className="text-xs text-muted">Search</span>
          <input
            name="q"
            defaultValue={query}
            placeholder="Name, brand or slug"
            className="mt-1.5 w-full border border-line px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="w-36">
          <span className="text-xs text-muted">Status</span>
          <select name="status" defaultValue={status} className="mt-1.5 w-full border border-line px-2 py-2 text-sm">
            <option value="">All</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>

        <label className="w-40">
          <span className="text-xs text-muted">Category</span>
          <select name="category" defaultValue={categoryId} className="mt-1.5 w-full border border-line px-2 py-2 text-sm">
            <option value="">All</option>
            <option value="none">Uncategorised</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>

        <label className="w-36">
          <span className="text-xs text-muted">Stock</span>
          <select name="stock" defaultValue={stock} className="mt-1.5 w-full border border-line px-2 py-2 text-sm">
            <option value="">Any</option>
            <option value="low">Low (1-5)</option>
            <option value="out">Sold out</option>
          </select>
        </label>

        <label className="w-40">
          <span className="text-xs text-muted">Sort</span>
          <select name="sort" defaultValue={sort} className="mt-1.5 w-full border border-line px-2 py-2 text-sm">
            {Object.entries(SORTS).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </label>

        <button type="submit" className="bg-brand px-5 py-2 text-sm text-white">
          Apply
        </button>

        {(query || status || categoryId || stock || sort !== "newest") && (
          <Link href="/admin/products" className="py-2 text-sm underline">
            Clear
          </Link>
        )}
      </form>

      <p className="mt-4 text-sm text-muted">
        {products.length} {products.length === 1 ? "product" : "products"}
      </p>

      {products.length === 0 ? (
        <p className="mt-8 text-muted">Nothing matches those filters.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {products.map((product) => {
            const cover = imageList(product.images)[0];
            const prices = product.variants.map((v) => v.priceKobo);
            const stock = product.variants.reduce((sum, v) => sum + v.stock, 0);

            return (
              <li
                key={product.id}
                className="flex flex-wrap items-center gap-4 py-4"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt=""
                    className="size-14 shrink-0 bg-brand-soft/40 object-cover"
                  />
                ) : (
                  <span className="size-14 shrink-0 bg-brand-soft/40" />
                )}

                <div className="min-w-48 flex-1">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="text-sm font-semibold hover:text-muted"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted">
                    {product.brand ?? "No brand"} ·{" "}
                    {product.category?.name ?? "Uncategorised"} ·{" "}
                    {product.variants.length} variants
                  </p>
                </div>

                <div className="text-sm">
                  {prices.length > 0 ? koboToNaira(Math.min(...prices)) : "—"}
                </div>

                <div
                  className={`text-sm ${stock === 0 ? "text-red-600" : "text-muted"}`}
                >
                  {stock} in stock
                </div>

                <span
                  className={`px-2 py-1 text-xs ${
                    STATUS_STYLE[product.status] ?? "bg-line text-muted"
                  }`}
                >
                  {product.status}
                </span>

                <form action={setProductStatus} className="flex items-center gap-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <select
                    name="status"
                    defaultValue={product.status}
                    aria-label={`Status for ${product.name}`}
                    className="border border-line px-2 py-1.5 text-sm"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                  <button type="submit" className="text-sm underline">
                    Set
                  </button>
                </form>

                <form action={deleteProduct}>
                  <input type="hidden" name="productId" value={product.id} />
                  <ConfirmSubmit
                    ariaLabel={`Delete ${product.name}`}
                    message={`Delete "${product.name}" permanently? This cannot be undone. A product that has ever sold cannot be deleted — archive it instead.`}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                    Delete
                  </ConfirmSubmit>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
