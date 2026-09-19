import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import Breadcrumb from "@/app/_components/breadcrumb";
import Prose from "@/app/_components/prose";

async function getPost(slug: string) {
  const post = await getPrisma().blogPost.findUnique({ where: { slug } });
  return post?.status === "PUBLISHED" ? post : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return { title: "Not found" };
  return { title: post.title, description: post.excerpt ?? undefined };
}

export default async function BlogPostPage({
  params,
}: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-10">
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: post.title },
        ]}
      />

      <h1 className="mt-6 text-3xl tracking-tight text-brand-dark">
        {post.title}
      </h1>

      {post.publishedAt && (
        <p className="mt-2 text-sm text-muted">
          {post.publishedAt.toLocaleDateString("en-NG", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}

      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage}
          alt=""
          className="mt-8 aspect-[2/1] w-full bg-brand-soft/40 object-cover"
        />
      )}

      <div className="mt-8">
        <Prose text={post.body} />
      </div>
    </article>
  );
}
