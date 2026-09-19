import type { Metadata } from "next";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { saveSitePage } from "@/app/_actions/admin";

export const metadata: Metadata = { title: "Pages" };

/** Fixed slugs, because the header and footer link to these addresses. */
const PAGES = [
  { slug: "our-story", title: "Our Story" },
  { slug: "contact", title: "Contact Us" },
];

export default async function AdminPagesPage() {
  if (!(await requireAdmin())) return null;

  const existing = await getPrisma().sitePage.findMany({
    where: { slug: { in: PAGES.map((p) => p.slug) } },
  });

  const bySlug = new Map(existing.map((page) => [page.slug, page]));

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Pages</h1>
      <p className="mt-2 text-sm text-muted">
        These are linked from the header and footer, so their addresses stay
        fixed. Leave one unpublished and its link disappears from the site.
      </p>

      <div className="mt-8 space-y-10">
        {PAGES.map((template) => {
          const page = bySlug.get(template.slug);

          return (
            <form
              key={template.slug}
              action={saveSitePage}
              className="max-w-2xl border border-line p-6"
            >
              <input type="hidden" name="slug" value={template.slug} />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">{template.title}</h2>
                <Link href={`/${template.slug}`} className="text-sm underline">
                  /{template.slug}
                </Link>
              </div>

              <label className="mt-5 block">
                <span className="text-xs text-muted">Heading</span>
                <input
                  name="title"
                  required
                  defaultValue={page?.title ?? template.title}
                  className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
                />
              </label>

              <label className="mt-5 block">
                <span className="text-xs text-muted">
                  Body — a blank line starts a new paragraph
                </span>
                <textarea
                  name="body"
                  rows={10}
                  defaultValue={page?.body ?? ""}
                  placeholder={
                    template.slug === "contact"
                      ? "How to reach you: phone, email, address, opening hours."
                      : "The story behind Kidoclassic Mall."
                  }
                  className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
                />
              </label>

              <label className="mt-5 flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked={page?.published ?? true}
                  className="size-4 accent-brand"
                />
                Published
              </label>

              <button
                type="submit"
                className="mt-6 bg-brand px-8 py-3 text-sm text-white"
              >
                Save {template.title}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
