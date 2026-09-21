import type { Metadata } from "next";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { deleteBlogPost, saveBlogPost } from "@/app/_actions/admin";
import ImageUploader from "@/app/_components/image-uploader";
import SubmitButton from "@/app/_components/submit-button";

export const metadata: Metadata = { title: "Blog" };

export default async function AdminBlogPage({
  searchParams,
}: PageProps<"/admin/blog">) {
  if (!(await requireAdmin())) return null;

  const params = await searchParams;
  const editingId = typeof params.edit === "string" ? params.edit : null;

  const prisma = getPrisma();
  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
  const editing = posts.find((post) => post.id === editingId) ?? null;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
      <p className="mt-2 text-sm text-muted">
        Published posts appear at <code>/blog</code>. Drafts stay hidden.
      </p>

      <form action={saveBlogPost} className="mt-8 max-w-2xl border border-line p-6">
        <h2 className="font-semibold">{editing ? "Edit post" : "New post"}</h2>
        {editing && <input type="hidden" name="postId" value={editing.id} />}

        <label className="mt-5 block">
          <span className="text-xs text-muted">Title</span>
          <input
            name="title"
            required
            defaultValue={editing?.title ?? ""}
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-xs text-muted">Excerpt (shown on the list)</span>
          <input
            name="excerpt"
            defaultValue={editing?.excerpt ?? ""}
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <div className="mt-5">
          <span className="text-xs text-muted">Cover image</span>
          <div className="mt-1.5">
            <ImageUploader
              name="coverImage"
              multiple={false}
              initial={editing?.coverImage ? [editing.coverImage] : []}
            />
          </div>
        </div>

        <label className="mt-5 block">
          <span className="text-xs text-muted">
            Body — a blank line starts a new paragraph
          </span>
          <textarea
            name="body"
            rows={12}
            required
            defaultValue={editing?.body ?? ""}
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-xs text-muted">Status</span>
          <select
            name="status"
            defaultValue={editing?.status ?? "DRAFT"}
            className="mt-1.5 block border border-line px-3 py-2.5 text-sm"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </label>

        <div className="mt-6 flex gap-3">
          {editing && (
            <a href="/admin/blog" className="bg-line/60 px-6 py-3 text-sm hover:bg-line">
              Cancel
            </a>
          )}
          <SubmitButton variant="primary">{editing ? "Save changes" : "Create post"}</SubmitButton>
        </div>
      </form>

      {posts.length > 0 && (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center gap-4 py-4">
              <div className="min-w-48 flex-1">
                <p className="text-sm font-semibold">{post.title}</p>
                <p className="mt-0.5 text-sm text-muted">/blog/{post.slug}</p>
              </div>

              <span
                className={`px-2 py-1 text-xs ${
                  post.status === "PUBLISHED"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {post.status}
              </span>

              <a href={`/admin/blog?edit=${post.id}`} className="text-sm underline">
                Edit
              </a>

              {post.status === "PUBLISHED" && (
                <Link href={`/blog/${post.slug}`} className="text-sm underline">
                  View
                </Link>
              )}

              <form action={deleteBlogPost}>
                <input type="hidden" name="postId" value={post.id} />
                <SubmitButton variant="danger"><Trash2 aria-hidden className="size-3.5" />
                  Delete</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
