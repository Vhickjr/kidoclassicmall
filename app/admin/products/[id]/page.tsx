import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { compareSizes, imageList } from "@/lib/format";
import ImageUploader from "@/app/_components/image-uploader";
import { Trash2 } from "lucide-react";
import {
  addVariant,
  deleteVariant,
  updateProductDetails,
  updateVariant,
} from "@/app/_actions/admin";

export const metadata: Metadata = { title: "Edit product" };

const naira = (kobo: number) => (kobo / 100).toFixed(2);

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  // The gate has to sit here, not only in the layout. A layout returning early
  // does not stop its child page running, and the page's output still reaches
  // the client in the RSC payload — customer emails included.
  if (!(await requireAdmin())) return null;

  const { id } = await params;
  const prisma = getPrisma();

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  const variants = [...product.variants].sort((a, b) =>
    compareSizes(a.size, b.size)
  );

  return (
    <div>
      <Link href="/admin/products" className="text-sm underline">
        Back to products
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">{product.name}</h1>
      <p className="mt-1 text-sm text-muted">
        <Link href={`/products/${product.slug}`} className="underline">
          /products/{product.slug}
        </Link>
      </p>

      <form action={updateProductDetails} className="mt-8 max-w-xl">
        <input type="hidden" name="productId" value={product.id} />

        <label className="block">
          <span className="text-xs text-muted">Name</span>
          <input
            name="name"
            defaultValue={product.name}
            required
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-xs text-muted">Brand</span>
          <input
            name="brand"
            defaultValue={product.brand ?? ""}
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-xs text-muted">Category</span>
          <select
            name="categoryId"
            defaultValue={product.categoryId ?? ""}
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          >
            <option value="">Uncategorised</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5">
          <span className="text-xs text-muted">Photos</span>
          <div className="mt-1.5">
            <ImageUploader name="images" initial={imageList(product.images)} />
          </div>
        </div>

        <div className="mt-5">
          <span className="text-xs text-muted">Showcase video (optional)</span>
          <p className="mt-1 text-xs text-muted">
            Plays alongside the photos on the product page.
          </p>
          <div className="mt-1.5">
            <ImageUploader
              name="videoUrl"
              accept="video/*"
              multiple={false}
              initial={product.videoUrl ? [product.videoUrl] : []}
            />
          </div>
        </div>

        <label className="mt-5 block">
          <span className="text-xs text-muted">Description</span>
          <textarea
            name="description"
            rows={5}
            defaultValue={product.description ?? ""}
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <button
          type="submit"
          className="mt-6 bg-brand px-8 py-3 text-sm text-white"
        >
          Save details
        </button>
      </form>

      <h2 className="mt-12 font-semibold">Sizes, colours, price and stock</h2>
      <p className="mt-1 text-sm text-muted">
        One row per size/colour combination. Prices are entered in naira and
        stored as kobo. Leave colour blank for a product that does not vary by
        colour.
      </p>

      {variants.length > 0 && (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {variants.map((variant) => (
            <li key={variant.id} className="py-4">
              <form
                action={updateVariant}
                className="flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="variantId" value={variant.id} />

                <label className="block">
                  <span className="text-xs text-muted">Size</span>
                  <input
                    name="size"
                    required
                    defaultValue={variant.size}
                    className="mt-1 w-20 border border-line px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-muted">Colour</span>
                  <input
                    name="color"
                    defaultValue={variant.color ?? ""}
                    placeholder="optional"
                    className="mt-1 w-28 border border-line px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-muted">Custom Options (JSON)</span>
                  <input
                    name="customOptionsJson"
                    defaultValue={
                      variant.customOptions
                        ? JSON.stringify(variant.customOptions)
                        : ""
                    }
                    placeholder='{"Material":"Silk"}'
                    className="mt-1 w-44 border border-line px-3 py-2 text-xs font-mono"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-muted">Price (₦)</span>
                  <input
                    name="price"
                    defaultValue={naira(variant.priceKobo)}
                    className="mt-1 w-28 border border-line px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-muted">Was (₦)</span>
                  <input
                    name="compareAt"
                    defaultValue={
                      variant.compareAtKobo ? naira(variant.compareAtKobo) : ""
                    }
                    placeholder="optional"
                    className="mt-1 w-28 border border-line px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-muted">Stock</span>
                  <input
                    name="stock"
                    type="number"
                    min={0}
                    defaultValue={variant.stock}
                    className="mt-1 w-24 border border-line px-3 py-2 text-sm"
                  />
                </label>

                <button
                  type="submit"
                  className="bg-brand px-5 py-2.5 text-sm text-white"
                >
                  Save
                </button>
              </form>

              <form action={deleteVariant} className="mt-2">
                <input type="hidden" name="variantId" value={variant.id} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
                >
                  <Trash2 aria-hidden className="size-3.5" />
                  Remove this size/colour
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-8 text-sm font-semibold">Add a size or colour</h3>
      <form
        action={addVariant}
        className="mt-3 flex flex-wrap items-end gap-3 border border-line p-4"
      >
        <input type="hidden" name="productId" value={product.id} />

        <label className="block">
          <span className="text-xs text-muted">Size</span>
          <input
            name="size"
            required
            placeholder="M"
            className="mt-1 w-20 border border-line px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Colour</span>
          <input
            name="color"
            placeholder="optional"
            className="mt-1 w-28 border border-line px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Custom Options (JSON)</span>
          <input
            name="customOptionsJson"
            placeholder='{"Material":"Silk"}'
            className="mt-1 w-44 border border-line px-3 py-2 text-xs font-mono"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Price (₦)</span>
          <input
            name="price"
            required
            placeholder="0.00"
            className="mt-1 w-28 border border-line px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Was (₦)</span>
          <input
            name="compareAt"
            placeholder="optional"
            className="mt-1 w-28 border border-line px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Stock</span>
          <input
            name="stock"
            type="number"
            min={0}
            defaultValue={0}
            className="mt-1 w-24 border border-line px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          className="bg-brand px-5 py-2.5 text-sm text-white"
        >
          Add
        </button>
      </form>
    </div>
  );
}
