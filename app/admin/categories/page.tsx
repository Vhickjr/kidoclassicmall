import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createCategory, deleteCategory } from "@/app/_actions/admin";
import ImageUploader from "@/app/_components/image-uploader";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  // The gate has to sit here, not only in the layout. A layout returning early
  // does not stop its child page running, and the page's output still reaches
  // the client in the RSC payload — customer emails included.
  if (!(await requireAdmin())) return null;

  const categories = await getPrisma().category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Categories</h1>

      <form action={createCategory} className="mt-8 flex max-w-2xl flex-wrap gap-3">
        <label className="min-w-40 flex-1">
          <span className="text-xs text-muted">Name</span>
          <input
            name="name"
            required
            placeholder="Outerwear"
            className="mt-1.5 w-full border border-line px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <div className="min-w-40 flex-1">
          <span className="text-xs text-muted">Image</span>
          <div className="mt-1.5">
            <ImageUploader name="imageUrl" multiple={false} />
          </div>
        </div>
        <button
          type="submit"
          className="self-end bg-brand px-6 py-2.5 text-sm text-white"
        >
          Add
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="mt-8 text-muted">No categories yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center gap-4 py-4"
            >
              {category.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={category.imageUrl}
                  alt=""
                  className="size-12 shrink-0 bg-brand-soft/40 object-cover"
                />
              ) : (
                <span className="size-12 shrink-0 bg-brand-soft/40" />
              )}

              <div className="min-w-40 flex-1">
                <p className="text-sm font-semibold">{category.name}</p>
                <p className="mt-0.5 text-sm text-muted">/{category.slug}</p>
              </div>

              <span className="text-sm text-muted">
                {category._count.products}{" "}
                {category._count.products === 1 ? "product" : "products"}
              </span>

              <form action={deleteCategory}>
                <input type="hidden" name="categoryId" value={category.id} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
                >
                  <Trash2 aria-hidden className="size-3.5" />
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 rounded border border-dashed border-line px-3 py-2 text-xs text-muted">
        Deleting a category leaves its products in place and simply unfiles them.
      </p>
    </div>
  );
}
