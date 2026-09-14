import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { imageList, koboToNaira } from "@/lib/format";
import { setProductStatus } from "@/app/_actions/admin";

export const metadata: Metadata = { title: "Products" };

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-800",
  DRAFT: "bg-amber-100 text-amber-800",
  ARCHIVED: "bg-line text-muted",
};

export default async function AdminProductsPage() {
  // The gate has to sit here, not only in the layout. A layout returning early
  // does not stop its child page running, and the page's output still reaches
  // the client in the RSC payload — customer emails included.
  if (!(await requireAdmin())) return null;

  const products = await getPrisma().product.findMany({
    include: { variants: true, category: true },
    orderBy: { createdAt: "desc" },
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

      {products.length === 0 ? (
        <p className="mt-8 text-muted">No products yet.</p>
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
