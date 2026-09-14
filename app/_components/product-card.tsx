import Link from "next/link";
import { Eye, Heart, Repeat } from "lucide-react";
import { imageList, koboToNaira } from "@/lib/format";

export type ProductCardData = {
  slug: string;
  brand: string | null;
  name: string;
  image: string | undefined;
  priceKobo: number;
  compareAtKobo: number | null;
  mixedPricing: boolean;
  soldOut: boolean;
};

type QueriedProduct = {
  slug: string;
  brand: string | null;
  name: string;
  images: unknown;
  variants: { priceKobo: number; compareAtKobo: number | null; stock: number }[];
};

/** A card advertises the cheapest size, so the "was" price has to come from
 *  that same variant rather than from whichever row the database returned first. */
export function toProductCard(product: QueriedProduct): ProductCardData {
  const prices = product.variants.map((variant) => variant.priceKobo);
  const lowest = Math.min(...prices);
  const cheapest = product.variants.find(
    (variant) => variant.priceKobo === lowest
  );

  return {
    slug: product.slug,
    brand: product.brand,
    name: product.name,
    image: imageList(product.images)[0],
    priceKobo: lowest,
    compareAtKobo: cheapest?.compareAtKobo ?? null,
    mixedPricing: lowest !== Math.max(...prices),
    soldOut: product.variants.every((variant) => variant.stock === 0),
  };
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-3/4 overflow-hidden bg-brand-soft/40">
        {product.image ? (
          // Hosts are unknown until image hosting is settled, so no next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-muted">
            No photo
          </span>
        )}

        {product.soldOut && (
          <span className="absolute left-3 top-3 bg-surface px-2 py-1 text-xs uppercase tracking-wide">
            Sold out
          </span>
        )}

        {/* Decorative. Wishlist, compare and quick view have no models, and the
            cart is step 3 — these are spans, not buttons, so nothing offers a
            click it cannot honour. The whole card already links to the product. */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100"
        >
          {[Heart, Repeat, Eye].map((Icon, index) => (
            <span
              key={index}
              className="flex size-8 items-center justify-center rounded-full bg-surface shadow"
            >
              <Icon className="size-4" />
            </span>
          ))}
        </span>

        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-4 bg-surface py-2.5 text-center text-sm opacity-0 transition-opacity group-hover:opacity-100"
        >
          {product.soldOut ? "Sold out" : "View product"}
        </span>
      </div>

      {product.brand && (
        <p className="mt-3 text-sm font-semibold">{product.brand}</p>
      )}
      <h3 className="mt-0.5 text-sm text-muted">{product.name}</h3>

      <p className="mt-1 flex items-baseline gap-2 text-sm">
        <span className="font-semibold text-brand-dark">
          {product.mixedPricing
            ? `From ${koboToNaira(product.priceKobo)}`
            : koboToNaira(product.priceKobo)}
        </span>
        {product.compareAtKobo && product.compareAtKobo > product.priceKobo && (
          <span className="text-muted line-through">
            {koboToNaira(product.compareAtKobo)}
          </span>
        )}
      </p>
    </Link>
  );
}
