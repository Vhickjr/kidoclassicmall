import type { Metadata } from "next";
import { getPrisma } from "@/lib/prisma";
import Breadcrumb from "@/app/_components/breadcrumb";
import Prose from "@/app/_components/prose";

const SLUG = "contact";
const FALLBACK_TITLE = "Contact Us";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPrisma().sitePage.findUnique({ where: { slug: SLUG } });
  return { title: page?.title ?? FALLBACK_TITLE };
}

export default async function Page() {
  const page = await getPrisma().sitePage.findUnique({ where: { slug: SLUG } });

  // This page is linked from the main navigation, so it always answers. Until
  // there is content it renders as a heading with nothing under it, rather
  // than 404ing and turning a nav link into a dead end.
  const title = page?.published ? page.title : FALLBACK_TITLE;
  const body = page?.published ? page.body : "";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: title }]} />
      <h1 className="mt-6 text-3xl tracking-tight text-brand-dark">{title}</h1>
      <div className="mt-8">
        <Prose text={body} />
      </div>
    </div>
  );
}
