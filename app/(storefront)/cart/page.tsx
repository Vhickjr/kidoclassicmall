import type { Metadata } from "next";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cartSubtotalKobo, readCart } from "@/lib/cart";
import { imageList } from "@/lib/format";
import { removeCartItem, setCartItemQuantity } from "@/app/_actions/cart";
import ValueProps from "@/app/_components/value-props";
import Money from "@/app/_components/money";

export const metadata: Metadata = {
  title: "Cart",
};

export default async function CartPage() {
  const cart = await readCart();
  const lines = cart?.items ?? [];
  const subtotal = cartSubtotalKobo(cart);

  if (lines.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16">
        <h1 className="text-3xl tracking-tight text-brand-dark">Cart</h1>
        <p className="mt-6 text-muted">Your cart is empty.</p>
        <Link
          href="/shop"
          className="mt-8 inline-block bg-brand px-6 py-3 text-sm text-white"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <h1 className="text-3xl tracking-tight text-brand-dark">Cart</h1>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_20rem]">
          <div>
            <div className="hidden grid-cols-[1fr_7rem_9rem_7rem] gap-4 border-b border-line pb-3 text-sm text-muted md:grid">
              <span>Products</span>
              <span>Price</span>
              <span>Quantity</span>
              <span className="text-right">Subtotal</span>
            </div>

            <ul className="divide-y divide-line">
              {lines.map((line) => {
                const cover = imageList(line.variant.product.images)[0];

                return (
                  <li
                    key={line.id}
                    className="grid gap-4 py-6 md:grid-cols-[1fr_7rem_9rem_7rem] md:items-center"
                  >
                    <div className="flex items-start gap-4">
                      {cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt=""
                          className="size-20 shrink-0 bg-brand-soft/40 object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/products/${line.variant.product.slug}`}
                          className="text-sm font-semibold hover:text-muted"
                        >
                          {line.variant.product.name}
                        </Link>
                        <p className="mt-1 text-sm text-muted">
                          Size: {line.variant.size}
                          {line.variant.color ? ` · ${line.variant.color}` : ""}
                        </p>

                        <form action={removeCartItem} className="mt-2">
                          <input type="hidden" name="itemId" value={line.id} />
                          <button
                            type="submit"
                            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700"
                          >
                            <Trash2 aria-hidden className="size-3.5" />
                            Remove
                          </button>
                        </form>
                      </div>
                    </div>

                    <p className="text-sm"><Money kobo={line.variant.priceKobo} /></p>

                    <div className="flex items-center border border-line">
                      <QuantityButton
                        itemId={line.id}
                        quantity={line.quantity - 1}
                        label="Decrease quantity"
                      >
                        <Minus aria-hidden className="size-4" />
                      </QuantityButton>

                      <span className="w-10 text-center text-sm tabular-nums">
                        {line.quantity}
                      </span>

                      <QuantityButton
                        itemId={line.id}
                        quantity={line.quantity + 1}
                        label="Increase quantity"
                        disabled={line.quantity >= line.variant.stock}
                      >
                        <Plus aria-hidden className="size-4" />
                      </QuantityButton>
                    </div>

                    <p className="text-sm font-semibold md:text-right">
                      <Money kobo={line.variant.priceKobo * line.quantity} />
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>

          <aside className="h-fit border border-line p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Subtotal</span>
              <span className="text-sm font-semibold"><Money kobo={subtotal} /></span>
            </div>

            {/* The mockup also shows a discount code box and a delivery charge.
                Both need decisions and models that do not exist yet, so the
                total is the subtotal until then. */}
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="font-semibold">Grand Total</span>
              <span className="font-semibold"><Money kobo={subtotal} /></span>
            </div>

            <Link
              href="/checkout"
              className="mt-6 block bg-brand py-3.5 text-center text-sm text-white"
            >
              Proceed to Checkout
            </Link>

            <p className="mt-4 text-xs text-muted">
              Delivery charges and discount codes are not set up yet.
            </p>
          </aside>
        </div>
      </div>

      <ValueProps />
    </div>
  );
}

function QuantityButton({
  itemId,
  quantity,
  label,
  disabled,
  children,
}: {
  itemId: string;
  quantity: number;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form action={setCartItemQuantity}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="quantity" value={quantity} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        className="px-3 py-3 disabled:opacity-30"
      >
        {children}
      </button>
    </form>
  );
}
