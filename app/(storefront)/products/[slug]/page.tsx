import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { compareSizes, imageList } from "@/lib/format";
import SizeSelector from "./size-selector";

async function getPublishedProduct(slug: string) {
  const product = await getPrisma().product.findUnique({
    where: { slug },
    include: { variants: true, category: true },
  });

  return product?.status === "PUBLISHED" ? product : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);

  if (!product) return { title: "Not found" };

  return {
    title: product.name,
    description: product.description ?? undefined,
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);

  if (!product) notFound();

  const images = imageList(product.images);
  const variants = [...product.variants].sort((a, b) =>
    compareSizes(a.size, b.size)
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
      <div className="grid gap-3">
        {images.length === 0 ? (
          <div className="flex aspect-3/4 items-center justify-center bg-line/40 text-sm text-muted">
            No photo
          </div>
        ) : (
          images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={product.name}
              className="aspect-3/4 w-full bg-line/40 object-cover"
            />
          ))
        )}
      </div>

      <div className="md:sticky md:top-10 md:self-start">
        {product.category && (
          <p className="text-sm text-muted">{product.category.name}</p>
        )}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {product.name}
        </h1>

        <SizeSelector
          variants={variants.map((variant) => ({
            id: variant.id,
            size: variant.size,
            color: variant.color,
            priceKobo: variant.priceKobo,
            stock: variant.stock,
          }))}
        />

        {product.description && (
          <p className="mt-8 whitespace-pre-line text-sm leading-relaxed text-muted">
            {product.description}
          </p>
        )}
      </div>
    </div>
  );
}
