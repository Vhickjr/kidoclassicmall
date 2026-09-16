import type { Metadata } from "next";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { readSessionId } from "@/lib/cart";
import { imageList } from "@/lib/format";
import { removeWishlistItem } from "@/app/_actions/account";
import Money from "@/app/_components/money";

export const metadata: Metadata = { title: "My Wishlists" };

export default async function WishlistPage() {
  const sessionId = await readSessionId();

  const items = sessionId
    ? await getPrisma().wishlistItem.findMany({
        where: { sessionId, product: { status: "PUBLISHED" } },
        include: { product: { include: { variants: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  if (items.length === 0) {
    return (
      <div>
        <h2 className="font-semibold">My Wishlists</h2>
        <p className="mt-6 text-sm text-muted">
          Nothing saved yet. Tap the heart on any product to keep it here.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block bg-brand px-6 py-3 text-sm text-white"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-semibold">My Wishlists</h2>

      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3">
        {items.map((item) => {
          const cover = imageList(item.product.images)[0];
          const prices = item.product.variants.map((v) => v.priceKobo);
          const lowest = prices.length > 0 ? Math.min(...prices) : null;
          const soldOut = item.product.variants.every((v) => v.stock === 0);

          return (
            <li key={item.id}>
              <div className="group relative">
                <Link
                  href={`/products/${item.product.slug}`}
                  className="block aspect-3/4 overflow-hidden bg-brand-soft/40"
                >
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt={item.product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </Link>

                <form action={removeWishlistItem} className="absolute right-3 top-3">
                  <input type="hidden" name="itemId" value={item.id} />
                  <button
                    type="submit"
                    aria-label={`Remove ${item.product.name}`}
                    className="flex size-8 items-center justify-center rounded-full bg-surface text-red-500 shadow hover:text-red-700"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </form>

                <Link
                  href={`/products/${item.product.slug}`}
                  className="absolute inset-x-4 bottom-4 bg-surface py-2.5 text-center text-sm opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {soldOut ? "Sold out" : "Pick a size"}
                </Link>
              </div>

              {item.product.brand && (
                <p className="mt-3 text-sm font-semibold">{item.product.brand}</p>
              )}
              <p className="mt-0.5 text-sm text-muted">{item.product.name}</p>
              {lowest !== null && (
                <p className="mt-1 text-sm font-medium"><Money kobo={lowest} /></p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-8 rounded border border-dashed border-line px-3 py-2 text-xs text-muted">
        The mockup&rsquo;s &ldquo;Move to Cart&rdquo; needs a size chosen first,
        so it links through to the product instead.
      </p>
    </div>
  );
}
