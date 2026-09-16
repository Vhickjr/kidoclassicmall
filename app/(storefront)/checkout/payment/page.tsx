import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PAYMENT_METHODS, loadCheckout } from "@/lib/checkout";
import { selectPaymentMethod } from "@/app/_actions/checkout";
import CheckoutSteps from "@/app/_components/checkout-steps";
import OrderSummary from "@/app/_components/order-summary";

export const metadata: Metadata = { title: "Payment Method" };

export default async function PaymentMethodPage() {
  const { cart, state, discount, totals } = await loadCheckout();
  if (!cart || cart.items.length === 0) redirect("/cart");
  if (!state.addressId) redirect("/checkout/address");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-3xl tracking-tight text-brand-dark">Payment Method</h1>

      <div className="mt-2 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div>
          <CheckoutSteps current="payment" />

          <h2 className="mt-10 font-semibold">Select a payment method</h2>

          <form action={selectPaymentMethod} className="mt-6 max-w-xl">
            <ul className="divide-y divide-line border-y border-line">
              {PAYMENT_METHODS.map((method) => (
                <li key={method.value}>
                  <label className="flex cursor-pointer items-center gap-3 py-5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      defaultChecked={
                        state.paymentMethod
                          ? state.paymentMethod === method.value
                          : method.value === "card"
                      }
                      className="size-4 accent-brand"
                    />
                    <span className="font-semibold">{method.label}</span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="mt-6 border border-dashed border-line p-5 text-sm text-muted">
              <p className="font-semibold text-foreground">
                Card details are entered in ALAT Pay&rsquo;s window
              </p>
              <p className="mt-2 leading-relaxed">
                The mockup for this screen asks for a card number, expiry and
                CVV. Taking those into our own form would put this store in the
                strictest tier of PCI-DSS scope, and storing a CVV is never
                permitted at all. Instead this step records the chosen method,
                then hands off to ALAT Pay, which returns a reference we keep in{" "}
                <code>Order.paymentRef</code>.
              </p>
              <p className="mt-2 leading-relaxed">
                Choosing Cash on Delivery skips the payment window and leaves the
                order for staff to settle in person.
              </p>
            </div>

            <button
              type="submit"
              className="mt-6 bg-brand px-10 py-3.5 text-sm text-white"
            >
              Continue
            </button>
          </form>
        </div>

        <OrderSummary
          totals={totals}
          appliedCode={discount.code}
          attemptedCode={state.discountCode}
        />
      </div>
    </div>
  );
}
