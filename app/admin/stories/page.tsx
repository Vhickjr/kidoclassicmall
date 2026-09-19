import type { Metadata } from "next";
import Image from "next/image";
import { Camera, Plus, Trash2, Eye, EyeOff, Film, Image as ImageIcon, ShoppingBag } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  createStory,
  toggleStoryActive,
  deleteStory,
  addStoryItem,
  deleteStoryItem,
} from "@/app/_actions/story";
import ImageUploader from "@/app/_components/image-uploader";

export const metadata: Metadata = {
  title: "Instagram Stories Management | Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminStoriesPage() {
  // The gate has to sit here, not only in the layout. A layout returning
  // early does not stop its child page running, and the page's output still
  // reaches the client in the RSC payload.
  if (!(await requireAdmin())) return null;

  const prisma = getPrisma();

  const [stories, products] = await Promise.all([
    prisma.story.findMany({
      include: {
        slides: {
          orderBy: { position: "asc" },
          include: { product: true },
        },
      },
      orderBy: { position: "asc" },
    }),
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, name: true, brand: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instagram Stories</h1>
          <p className="mt-1 text-sm text-muted">
            Create interactive Instagram-style stories, auto-playing slides, and bridge social content to product pages.
          </p>
        </div>
      </div>

      {/* Create New Story Form */}
      <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Plus className="size-4 text-brand" />
          Create New Story
        </h2>

        <form action={createStory} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-muted">Story Title</label>
            <input
              name="title"
              type="text"
              placeholder="e.g., Summer Collection 2026"
              required
              className="mt-1 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted">Brand Handle</label>
            <input
              name="brandHandle"
              type="text"
              defaultValue="@kidoclassic"
              placeholder="@brandname"
              required
              className="mt-1 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted">Cover image</label>
            <div className="mt-1">
              <ImageUploader name="coverImage" multiple={false} />
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-muted">
                Or paste a URL
              </summary>
              <input
                name="coverImageUrl"
                type="url"
                placeholder="https://..."
                className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand"
              />
            </details>
          </div>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-deep"
            >
              <Camera className="size-4" />
              Add Story
            </button>
          </div>
        </form>
      </div>

      {/* Existing Stories List */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold">Active &amp; Draft Stories ({stories.length})</h2>

        {stories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-12 text-center text-muted">
            <Camera className="mx-auto size-8 opacity-40" />
            <p className="mt-2 text-sm">No stories created yet. Use the form above to add your first story!</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {stories.map((story) => (
              <div
                key={story.id}
                className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
              >
                {/* Story Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 overflow-hidden rounded-xl border border-line bg-black">
                      <Image
                        src={story.coverImage}
                        alt={story.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground text-base">{story.title}</h3>
                        <span className="text-xs text-muted font-medium">{story.brandHandle}</span>
                      </div>
                      <p className="text-xs text-muted">
                        {story.slides.length} {story.slides.length === 1 ? "slide" : "slides"} • Status:{" "}
                        <span className={story.active ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                          {story.active ? "Active on Homepage" : "Hidden"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <form action={toggleStoryActive}>
                      <input type="hidden" name="id" value={story.id} />
                      <button
                        type="submit"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          story.active
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        }`}
                      >
                        {story.active ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                        {story.active ? "Active" : "Hidden"}
                      </button>
                    </form>

                    <form action={deleteStory}>
                      <input type="hidden" name="id" value={story.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="size-3.5" />
                        Delete Story
                      </button>
                    </form>
                  </div>
                </div>

                {/* Slides List */}
                <div className="p-4 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Slides / Items ({story.slides.length})
                  </h4>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {story.slides.map((slide) => (
                      <div
                        key={slide.id}
                        className="relative flex flex-col justify-between overflow-hidden rounded-lg border border-line bg-surface-muted/30 p-3"
                      >
                        <div className="flex gap-3">
                          <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-black">
                            {slide.mediaType === "VIDEO" ? (
                              <div className="flex size-full items-center justify-center bg-zinc-800 text-white">
                                <Film className="size-6" />
                              </div>
                            ) : (
                              <Image
                                src={slide.mediaUrl}
                                alt={slide.caption || "Slide"}
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted">
                              {slide.mediaType === "VIDEO" ? <Film className="size-3 text-purple-500" /> : <ImageIcon className="size-3 text-blue-500" />}
                              <span>{slide.mediaType} ({slide.durationSec}s)</span>
                            </div>

                            {slide.caption ? (
                              <p className="mt-1 line-clamp-2 text-xs font-medium text-foreground">
                                &ldquo;{slide.caption}&rdquo;
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-muted italic">No caption</p>
                            )}

                            {slide.product && (
                              <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-deep">
                                <ShoppingBag className="size-3" />
                                <span className="truncate max-w-[120px]">{slide.product.name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end border-t border-line/60 pt-2">
                          <form action={deleteStoryItem}>
                            <input type="hidden" name="id" value={slide.id} />
                            <button
                              type="submit"
                              className="text-xs text-red-600 hover:underline inline-flex items-center gap-1"
                            >
                              <Trash2 className="size-3" /> Delete Slide
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Slide Form for this story */}
                  <div className="mt-4 rounded-lg border border-dashed border-line bg-surface p-4">
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Plus className="size-3.5 text-brand" /> Add Slide to &ldquo;{story.title}&rdquo;
                    </h5>

                    <form action={addStoryItem} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <input type="hidden" name="storyId" value={story.id} />

                      <div>
                        <label className="block text-[10px] font-semibold text-muted">
                          Media (image or video)
                        </label>
                        <div className="mt-1">
                          <ImageUploader
                            name="mediaUrl"
                            multiple={false}
                            accept="image/*,video/*"
                          />
                        </div>
                        <details className="mt-1.5">
                          <summary className="cursor-pointer text-[10px] text-muted">
                            Or paste a URL
                          </summary>
                          <input
                            name="mediaUrlText"
                            type="url"
                            placeholder="https://..."
                            className="mt-1 w-full rounded border border-line px-2.5 py-1.5 text-xs outline-none focus:border-brand"
                          />
                        </details>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-muted">Media Type</label>
                        <select
                          name="mediaType"
                          className="mt-1 w-full rounded border border-line px-2.5 py-1.5 text-xs outline-none focus:border-brand"
                        >
                          <option value="IMAGE">Image</option>
                          <option value="VIDEO">Video</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-muted">Caption (Optional)</label>
                        <input
                          name="caption"
                          type="text"
                          placeholder="Short slide caption"
                          className="mt-1 w-full rounded border border-line px-2.5 py-1.5 text-xs outline-none focus:border-brand"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-muted">Attach Product (Shop This Bridge)</label>
                        <select
                          name="productId"
                          className="mt-1 w-full rounded border border-line px-2.5 py-1.5 text-xs outline-none focus:border-brand"
                        >
                          <option value="">No product attached</option>
                          {products.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.name} {prod.brand ? `(${prod.brand})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded bg-brand px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-deep"
                        >
                          <Plus className="size-3.5" />
                          Add Slide
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
