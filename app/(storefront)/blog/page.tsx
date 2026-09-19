import type { Metadata } from "next";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import Breadcrumb from "@/app/_components/breadcrumb";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogIndexPage() {
  const posts = await getPrisma().blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Blog" }]} />
      <h1 className="mt-6 text-3xl tracking-tight text-brand-dark">Blog</h1>

      {posts.length === 0 ? (
        <p className="mt-8 text-muted">No posts yet.</p>
      ) : (
        <ul className="mt-10 space-y-10">
          {posts.map((post) => (
            <li key={post.id} className="border-b border-line pb-10 last:border-0">
              <Link href={`/blog/${post.slug}`} className="group block">
                {post.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImage}
                    alt=""
                    className="mb-5 aspect-[2/1] w-full bg-brand-soft/40 object-cover"
                  />
                )}
                <h2 className="text-xl font-semibold group-hover:text-brand-deep">
                  {post.title}
                </h2>
                {post.publishedAt && (
                  <p className="mt-1 text-sm text-muted">
                    {post.publishedAt.toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
                {post.excerpt && (
                  <p className="mt-3 text-muted">{post.excerpt}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
