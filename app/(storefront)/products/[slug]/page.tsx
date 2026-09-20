import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { compareSizes, imageList } from "@/lib/format";
import { readSessionId } from "@/lib/cart";
import { getSessionUser } from "@/lib/auth";
import ProductCard, { toProductCard } from "@/app/_components/product-card";
import Breadcrumb from "@/app/_components/breadcrumb";
import StarRating from "@/app/_components/star-rating";
import ValueProps from "@/app/_components/value-props";
import Gallery from "./gallery";
import BuyPanel from "./buy-panel";
import ProductTabs from "./product-tabs";
import SizeChart from "@/app/_components/size-chart";

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

  const related = product.categoryId
    ? await getPrisma().product.findMany({
        where: {
          status: "PUBLISHED",
          categoryId: product.categoryId,
          NOT: { id: product.id },
        },
        include: { variants: true },
        orderBy: { createdAt: "desc" },
        take: 4,
      })
    : [];

  const colors = [
    ...new Set(
      product.variants.map((v) => v.color).filter((c): c is string => Boolean(c))
    ),
  ];
  const sizes = [...new Set(product.variants.map((v) => v.size))].sort(compareSizes);
  const inStock = product.variants.some((variant) => variant.stock > 0);

  const user = await getSessionUser();

  const approved = await getPrisma().review.findMany({
    where: { productId: product.id, status: "APPROVED" },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  const averageRating =
    approved.length > 0
      ? approved.reduce((sum, review) => sum + review.rating, 0) / approved.length
      : null;

  const canReview = user
    ? (await getPrisma().orderItem.findFirst({
        where: { order: { userId: user.id }, variant: { productId: product.id } },
      })) !== null
    : false;

  const sessionId = await readSessionId();
  const saved = sessionId
    ? (await getPrisma().wishlistItem.findUnique({
        where: { sessionId_productId: { sessionId, productId: product.id } },
      })) !== null
    : false;

  return (
    <div>
      <div className="mx-auto w-full max-w-6xl px-4 pt-8">
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            { label: product.name },
          ]}
        />
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-8 md:grid-cols-2">
        <Gallery
          images={imageList(product.images)}
          video={product.videoUrl}
          alt={product.name}
        />

        {/* `min-w-0` so this column can shrink below the width of its widest
            child. Without it the size chart's table — deliberately wider than a
            phone — stretches the grid column and pushes the whole page
            sideways, instead of scrolling inside its own box. */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              {product.brand && (
                <h1 className="text-2xl font-bold tracking-tight">
                  {product.brand}
                </h1>
              )}
              <p className="mt-1 text-lg text-muted">{product.name}</p>
            </div>

            <span
              className={`shrink-0 rounded px-2.5 py-1 text-xs ${
                inStock
                  ? "bg-green-100 text-green-800"
                  : "bg-line text-muted"
              }`}
            >
              {inStock ? "In Stock" : "Sold Out"}
            </span>
          </div>

          <div className="mt-3">
            <StarRating rating={averageRating} count={approved.length} />
          </div>

          <BuyPanel
            productId={product.id}
            saved={saved}
            variants={product.variants.map((variant) => ({
              id: variant.id,
              size: variant.size,
              color: variant.color,
              priceKobo: variant.priceKobo,
              compareAtKobo: variant.compareAtKobo,
              stock: variant.stock,
            }))}
          />

          <SizeChart />
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4">
        <ProductTabs
          description={product.description}
          colors={colors}
          sizes={sizes}
          canReview={canReview}
          reviews={approved.map((review) => ({
            id: review.id,
            rating: review.rating,
            title: review.title,
            body: review.body,
            author: review.user.firstName ?? "Verified buyer",
            createdAt: review.createdAt.toLocaleDateString("en-NG", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          }))}
        />
      </div>

      {related.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-2xl tracking-tight">Related Products</h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {related.map((item) => (
              <li key={item.id}>
                <ProductCard product={toProductCard(item)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ValueProps />
    </div>
  );
}
