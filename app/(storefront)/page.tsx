import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import ProductCard, { toProductCard } from "@/app/_components/product-card";
import DealCountdown from "@/app/_components/deal-countdown";
import ValueProps from "@/app/_components/value-props";
import StoriesSection from "@/app/_components/stories-section";
import { storeSettings } from "@/lib/settings-store";



/**
 * One half of the hero. Equal width by construction — the parent is a two-column
 * grid, so neither half can win space from the other whatever it contains.
 *
 * The picture is a real background rather than an <img> so the two halves stay
 * the same height as each other regardless of how differently the uploads are
 * cropped.
 */
function HeroHalf({
  image,
  children,
}: {
  image: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden bg-brand-soft/50 bg-cover bg-center"
      style={image ? { backgroundImage: `url(${image})` } : undefined}
    >
      {children}
    </div>
  );
}


// Without this the page is prerendered at build time, so a newly published
// product or a size selling out would not show until the next deploy.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const prisma = getPrisma();

  const [categories, bestsellers, deal, stories, testimonials] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.deal.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.story.findMany({
      where: { active: true },
      include: {
        slides: {
          orderBy: { position: "asc" },
          include: {
            product: {
              include: { variants: true },
            },
          },
        },
      },
      orderBy: { position: "asc" },
    }),
    prisma.review.findMany({
      where: { status: "APPROVED", rating: { gte: 4 } },
      include: {
        user: { select: { firstName: true, lastName: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const { hero } = await storeSettings();

  return (
    <div>
      {/* Hero: two equal halves, each its own background picture. The copy
          overlays the left half; both halves keep their proportions at every
          width, and stack only so the text stays readable on a phone. */}
      <section className="bg-gradient-to-br from-brand-soft via-background to-brand-soft/60">
        <div className="grid min-h-[22rem] grid-cols-2 md:min-h-[30rem]">
          <HeroHalf image={hero.leftImage}>
            {/* The scrim keeps the words legible whatever picture is uploaded;
                without it, light photography swallows the text. */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/45 to-black/10" />

            <div className="relative z-10 flex h-full flex-col justify-center px-5 py-10 sm:px-8 md:px-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/90 sm:text-sm">
                {hero.eyebrow}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                {hero.title}
              </h1>
              <p className="mt-3 text-base font-semibold text-white sm:text-lg">
                {hero.subtitle}
              </p>
              <Link
                href={hero.ctaHref}
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm text-white sm:mt-8 sm:px-6 sm:py-3"
              >
                {hero.ctaLabel}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </HeroHalf>

          <HeroHalf image={hero.rightImage} />
        </div>
      </section>

      {/* Shop by categories */}
      {categories.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-xl font-semibold tracking-tight text-brand-dark">
            Shop by Categories
          </h2>

          <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/shop?category=${category.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-3/4 overflow-hidden bg-brand-soft/40">
                    {category.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={category.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <span className="absolute inset-x-3 bottom-3 bg-surface py-2 text-center text-sm">
                      {category.name}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bestsellers */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="text-center text-xl font-semibold tracking-tight text-brand-dark">
          Our Bestseller
        </h2>

        {bestsellers.length === 0 ? (
          <p className="py-16 text-center text-muted">
            Nothing published yet. Products added in the admin will show here.
          </p>
        ) : (
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {bestsellers.map((product) => (
              <li key={product.id}>
                <ProductCard product={toProductCard(product)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Deals of the month — editable in the admin, hidden when none is live */}
      {deal && (
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-brand-dark">
              {deal.title}
            </h2>
            {deal.body && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted">
                {deal.body}
              </p>
            )}

            <DealCountdown endsAt={deal.endsAt.toISOString()} />

            <Link
              href={deal.ctaHref}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm text-white"
            >
              {deal.ctaLabel}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>

          {/* No stand-in picture: a deal without an image gets a brand-tinted
              panel rather than a stock photo of something she does not sell. */}
          {deal.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={deal.imageUrl}
              alt=""
              className="aspect-4/3 w-full bg-brand-soft/40 object-cover"
            />
          ) : (
            <div className="aspect-4/3 w-full bg-brand-soft/40" />
          )}
        </section>
      )}

      {/* Real approved reviews only. Staff have to approve a review before it
          is public, and with none approved yet this section does not render at
          all — an empty "what our customers say" is worse than no section. */}
      {testimonials.length > 0 && (
        <section className="bg-gradient-to-br from-brand-soft via-background to-brand-soft/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <h2 className="text-xl font-semibold tracking-tight text-brand-dark">
              What our customers say
            </h2>

            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {testimonials.map((review) => (
                <li
                  key={review.id}
                  className="rounded-lg bg-surface p-6 shadow-sm"
                >
                  <div className="flex gap-1 text-amber-500">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        aria-hidden
                        className={`size-4 ${index < review.rating ? "fill-current" : "opacity-30"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    {review.body}
                  </p>
                  <p className="mt-6 text-sm font-semibold">
                    {[review.user.firstName, review.user.lastName]
                      .filter(Boolean)
                      .join(" ") || "Verified customer"}
                  </p>
                  <p className="text-sm text-muted">{review.product.name}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Stories — real rows from the admin. The component returns null when
          there are none, so an empty list simply hides the section. */}
      <StoriesSection stories={stories} />

      <ValueProps />
    </div>
  );
}
