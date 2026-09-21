import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createCategory, deleteCategory, updateCategory } from "@/app/_actions/admin";
import ImageUploader from "@/app/_components/image-uploader";
import SubmitButton from "@/app/_components/submit-button";

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
        <SubmitButton variant="primary" className="self-end">Add</SubmitButton>
      </form>

      {categories.length === 0 ? (
        <p className="mt-8 text-muted">No categories yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {categories.map((category) => (
            <li key={category.id} className="py-4">
              <form
                action={updateCategory}
                className="flex flex-wrap items-end gap-4"
              >
                <input type="hidden" name="categoryId" value={category.id} />

                <div className="w-24 shrink-0">
                  <span className="text-xs text-muted">Image</span>
                  <div className="mt-1.5">
                    <ImageUploader
                      name="imageUrl"
                      multiple={false}
                      initial={category.imageUrl ? [category.imageUrl] : []}
                    />
                  </div>
                </div>

                <label className="min-w-40 flex-1">
                  <span className="text-xs text-muted">Name</span>
                  <input
                    name="name"
                    required
                    defaultValue={category.name}
                    className="mt-1.5 w-full border border-line px-4 py-2.5 text-sm outline-none focus:border-brand"
                  />
                  {/* The slug is fixed once created, so a rename here never
                      breaks a bookmarked /shop?category= link. */}
                  <span className="mt-0.5 block text-xs text-muted">
                    /{category.slug}
                  </span>
                </label>

                <span className="self-center pb-2.5 text-sm text-muted">
                  {category._count.products}{" "}
                  {category._count.products === 1 ? "product" : "products"}
                </span>

                <SubmitButton variant="primary" className="self-center">Save</SubmitButton>
              </form>

              <form action={deleteCategory} className="mt-2">
                <input type="hidden" name="categoryId" value={category.id} />
                <SubmitButton variant="danger"><Trash2 aria-hidden className="size-3.5" />
                  Delete</SubmitButton>
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
