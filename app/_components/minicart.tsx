import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";
import { cartCount, cartSubtotalKobo, readCart } from "@/lib/cart";
import { imageList, koboToNaira } from "@/lib/format";
import { removeCartItem } from "@/app/_actions/cart";

export default async function Minicart() {
  const cart = await readCart();
  const count = cartCount(cart);
  const subtotal = cartSubtotalKobo(cart);
  const lines = cart?.items ?? [];

  return (
    <div className="group relative">
      <Link href="/cart" className="relative flex items-center" aria-label="Cart">
        <ShoppingBag aria-hidden className="size-5 text-muted" />
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex size-4.5 items-center justify-center rounded-full bg-brand px-1 text-[10px] text-white">
            {count}
          </span>
        )}
      </Link>

      <div className="invisible absolute right-0 top-full z-30 w-80 pt-3 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="border border-line bg-surface p-5 shadow-xl">
          {lines.length === 0 ? (
            <p className="text-sm text-muted">Your cart is empty.</p>
          ) : (
            <>
              <p className="text-sm">
                You have {count} {count === 1 ? "item" : "items"} in your cart
              </p>

              <ul className="mt-4 divide-y divide-line">
                {lines.map((line) => (
                  <li key={line.id} className="flex items-start gap-3 py-3">
                    {imageList(line.variant.product.images)[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageList(line.variant.product.images)[0]}
                        alt=""
                        className="size-14 shrink-0 bg-brand-soft/40 object-cover"
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {line.variant.product.name}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold">
                        {line.quantity} &times; {koboToNaira(line.variant.priceKobo)}
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        Size: {line.variant.size}
                        {line.variant.color ? ` · ${line.variant.color}` : ""}
                      </p>
                    </div>

                    <form action={removeCartItem}>
                      <input type="hidden" name="itemId" value={line.id} />
                      <button
                        type="submit"
                        aria-label={`Remove ${line.variant.product.name}`}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <span className="text-sm font-semibold">Subtotal</span>
                <span className="text-sm font-semibold">
                  {koboToNaira(subtotal)}
                </span>
              </div>

              <Link
                href="/cart"
                className="mt-4 block border border-foreground py-2.5 text-center text-sm"
              >
                View Cart
              </Link>
              <Link
                href="/checkout"
                className="mt-2 block bg-brand py-2.5 text-center text-sm text-white"
              >
                Checkout
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
