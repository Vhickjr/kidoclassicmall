import Link from "next/link";
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
      <div className="relative aspect-3/4 overflow-hidden bg-line/40">
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
          <span className="absolute left-3 top-3 bg-background px-2 py-1 text-xs uppercase tracking-wide">
            Sold out
          </span>
        )}
      </div>

      {product.brand && (
        <p className="mt-3 text-sm font-semibold">{product.brand}</p>
      )}
      <h3 className="mt-0.5 text-sm text-muted">{product.name}</h3>

      <p className="mt-1 flex items-baseline gap-2 text-sm">
        <span className="font-medium">
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
