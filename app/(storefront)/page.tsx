import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import ProductCard, { toProductCard } from "@/app/_components/product-card";
import DealCountdown from "@/app/_components/deal-countdown";
import ValueProps from "@/app/_components/value-props";

// Placeholder photography and marketing copy. None of this has a model behind
// it yet, so it lives here until there is somewhere to edit it from.
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/900/1200`;

const DEAL_ENDS_AT = "2026-12-31T23:59:59Z";

const TESTIMONIALS = [
  {
    quote:
      "The sizing was exactly as described and it arrived in Lagos in two days. I have already ordered again.",
    name: "Leslie Alexander",
    role: "Customer",
  },
  {
    quote:
      "I have bought denim online plenty of times and sent most of it back. Not this. The fit is the fit.",
    name: "Jacob Jones",
    role: "Customer",
  },
  {
    quote:
      "Ordered a pair of heels for a wedding and they held up all night. Quality you can feel.",
    name: "Jenny Wilson",
    role: "Customer",
  },
];

// Without this the page is prerendered at build time, so a newly published
// product or a size selling out would not show until the next deploy.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const prisma = getPrisma();

  const [categories, bestsellers] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-soft via-background to-brand-soft/60">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
          <div className="relative z-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-deep">
              Classic Exclusive
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              Women&rsquo;s Collection
            </h1>
            <p className="mt-3 text-lg font-semibold text-brand-dark">Up to 40% off</p>
            <Link
              href="/shop"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm text-white"
            >
              Shop now
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>

          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-6xl font-bold tracking-tight text-background/70 sm:text-8xl"
            >
              BESTSALE
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo("hero-model")}
              alt=""
              className="relative mx-auto aspect-3/4 w-full max-w-sm border-8 border-background object-cover"
            />
          </div>
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

      {/* Deals of the month */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-brand-dark">
            Deals of the Month
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            New arrivals every month, discounted while the season lasts. Sizes
            go quickly, and the price returns to normal when the clock runs out.
          </p>

          <DealCountdown endsAt={DEAL_ENDS_AT} />

          <Link
            href="/shop"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm text-white"
          >
            View all products
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo("deal-of-month")}
          alt=""
          className="aspect-4/3 w-full bg-brand-soft/40 object-cover"
        />
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-br from-brand-soft via-background to-brand-soft/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-xl font-semibold tracking-tight text-brand-dark">
            What our customers say
          </h2>

          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <li key={testimonial.name} className="rounded-lg bg-surface p-6 shadow-sm">
                <div className="flex gap-1 text-amber-500">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      aria-hidden
                      className="size-4 fill-current"
                    />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {testimonial.quote}
                </p>
                <p className="mt-6 text-sm font-semibold">{testimonial.name}</p>
                <p className="text-sm text-muted">{testimonial.role}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Instagram */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="text-center text-xl font-semibold tracking-tight text-brand-dark">
          Our Instagram Stories
        </h2>

        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {["ig-1", "ig-2", "ig-3", "ig-4"].map((seed) => (
            <li key={seed}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo(seed)}
                alt=""
                className="aspect-square w-full bg-brand-soft/40 object-cover"
              />
            </li>
          ))}
        </ul>
      </section>

      <ValueProps />
    </div>
  );
}
