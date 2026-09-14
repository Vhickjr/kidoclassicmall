import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { PAYMENT_METHODS, loadCheckout } from "@/lib/checkout";
import { imageList, koboToNaira } from "@/lib/format";
import { placeOrder } from "@/app/_actions/checkout";
import CheckoutSteps from "@/app/_components/checkout-steps";
import OrderSummary from "@/app/_components/order-summary";

export const metadata: Metadata = { title: "Review Your Order" };

export default async function ReviewOrderPage() {
  const { cart, state, discount, totals } = await loadCheckout();
  if (!cart || cart.items.length === 0) redirect("/cart");
  if (!state.addressId) redirect("/checkout/address");

  const address = await getPrisma().address.findUnique({
    where: { id: state.addressId },
  });
  if (!address) redirect("/checkout/address");

  const method = PAYMENT_METHODS.find(
    (option) => option.value === (state.paymentMethod ?? "card")
  );

  // Placeholder logistics estimate until there is a delivery provider.
  const estimated = new Date();
  estimated.setDate(estimated.getDate() + 5);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-3xl tracking-tight text-brand-dark">Review Your Order</h1>

      <div className="mt-2 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div>
          <CheckoutSteps current="review" />

          <p className="mt-10 font-semibold">
            Estimated delivery:{" "}
            {estimated.toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>

          <ul className="mt-6 divide-y divide-line border-y border-line">
            {cart.items.map((line) => {
              const cover = imageList(line.variant.product.images)[0];

              return (
                <li key={line.id} className="flex items-start gap-4 py-5">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      className="size-20 shrink-0 bg-brand-soft/40 object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{line.variant.product.name}</p>
                    <p className="mt-1 text-sm">
                      {koboToNaira(line.variant.priceKobo)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Size: {line.variant.size}
                      {line.variant.color ? ` · ${line.variant.color}` : ""}
                      {" · "}Qty: {line.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {koboToNaira(line.variant.priceKobo * line.quantity)}
                  </p>
                </li>
              );
            })}
          </ul>

          <Section title="Shipping Address" editHref="/checkout/address">
            <p className="font-semibold">{address.fullName}</p>
            <p className="mt-1 text-sm text-muted">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
              {address.state}
              {address.postalCode ? ` ${address.postalCode}` : ""} &middot;{" "}
              {address.phone}
            </p>
          </Section>

          <Section title="Payment Method" editHref="/checkout/payment">
            <p className="font-semibold">{method?.label}</p>
            <p className="mt-1 text-sm text-muted">
              Nothing is charged yet — ALAT Pay is not connected.
            </p>
          </Section>
        </div>

        <OrderSummary
          totals={totals}
          appliedCode={discount.code}
          attemptedCode={state.discountCode}
        >
          <form action={placeOrder} className="mt-6">
            <label className="block">
              <span className="text-xs text-muted">Email for your receipt</span>
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="mt-1.5 w-full border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
            </label>
            <button
              type="submit"
              className="mt-4 w-full bg-brand py-3.5 text-sm text-white"
            >
              Place Order
            </button>
          </form>
        </OrderSummary>
      </div>
    </div>
  );
}

function Section({
  title,
  editHref,
  children,
}: {
  title: string;
  editHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-semibold">{title}</h2>
        <Link
          href={editHref}
          aria-label={`Edit ${title}`}
          className="flex size-9 items-center justify-center bg-brand-soft/60 hover:bg-line"
        >
          <Pencil aria-hidden className="size-4" />
        </Link>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
