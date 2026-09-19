import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { addressBook, loadCheckout } from "@/lib/checkout";
import { addAddress, deleteAddress, selectAddress } from "@/app/_actions/checkout";
import CheckoutSteps from "@/app/_components/checkout-steps";
import OrderSummary from "@/app/_components/order-summary";
import { NIGERIAN_STATES } from "@/lib/places";

export const metadata: Metadata = { title: "Shipping Address" };


export default async function ShippingAddressPage() {
  const { cart, state, discount, totals } = await loadCheckout();
  if (!cart || cart.items.length === 0) redirect("/cart");

  const addresses = await addressBook();

  // For the "Proceed to Payment" shortcut: whichever address is already chosen
  // for this checkout, else the default, else whatever exists — so a repeat
  // customer never has to click "Deliver here" just to confirm the obvious.
  const quickAddress =
    addresses.find((address) => address.id === state.addressId) ??
    addresses.find((address) => address.isDefault) ??
    addresses[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-3xl tracking-tight text-brand-dark">Shipping Address</h1>

      <div className="mt-2 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div>
          <CheckoutSteps current="address" />

          <h2 className="mt-10 font-semibold">Select a delivery address</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Is the address you would like to use shown below? If so, choose
            &ldquo;Deliver here&rdquo;. Otherwise add a new delivery address.
          </p>

          {addresses.length > 0 && (
            <>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {addresses.map((address) => (
                  <li
                    key={address.id}
                    className={`border p-5 ${
                      address.id === state.addressId
                        ? "border-foreground"
                        : "border-line"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{address.fullName}</p>
                      {address.isDefault && (
                        <span className="shrink-0 bg-line px-2 py-0.5 text-xs text-muted">
                          Default
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-muted">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}
                      <br />
                      {address.city}, {address.state}
                      {address.postalCode ? ` ${address.postalCode}` : ""}
                      <br />
                      {address.phone}
                    </p>

                    <div className="mt-4 flex gap-2">
                      {/* Editing an address is screen 23; not built yet. */}
                      <span className="flex flex-1 items-center justify-center gap-1.5 bg-brand-soft/60 py-2 text-sm text-muted">
                        <Pencil aria-hidden className="size-3.5" />
                        Edit
                      </span>

                      <form action={deleteAddress} className="flex-1">
                        <input type="hidden" name="addressId" value={address.id} />
                        <button
                          type="submit"
                          className="flex w-full items-center justify-center gap-1.5 bg-red-50 py-2 text-sm text-red-600 hover:bg-red-100"
                        >
                          <Trash2 aria-hidden className="size-3.5" />
                          Delete
                        </button>
                      </form>
                    </div>

                    <form action={selectAddress} className="mt-3">
                      <input type="hidden" name="addressId" value={address.id} />
                      <button
                        type="submit"
                        className="w-full bg-brand py-2.5 text-sm text-white"
                      >
                        Deliver here
                      </button>
                    </form>
                  </li>
                ))}
              </ul>

              <hr className="mt-10 border-line" />
            </>
          )}

          <h2 className="mt-10 font-semibold">Add a new address</h2>

          <form action={addAddress} className="mt-6 max-w-xl">
            <Field label="Name" name="fullName" placeholder="Enter name" required />
            <Field
              label="Mobile Number"
              name="phone"
              placeholder="Enter mobile number"
              required
            />
            <Field
              label="Flat, House no., Building, Company, Apartment"
              name="line1"
              required
            />
            <Field label="Area, Colony, Street, Sector, Village" name="line2" />
            <Field label="City" name="city" placeholder="Enter city" required />

            <label className="mt-5 block">
              <span className="text-xs text-muted">State</span>
              <select
                name="state"
                required
                defaultValue=""
                className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
              >
                <option value="" disabled>
                  Select state
                </option>
                {NIGERIAN_STATES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <Field label="Postcode" name="postalCode" placeholder="Optional" />

            <label className="mt-5 flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="isDefault"
                className="size-4 accent-brand"
              />
              Use as my default address
            </label>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="bg-brand px-8 py-3.5 text-sm text-white"
              >
                Add New Address
              </button>

              {quickAddress && (
                <button
                  type="submit"
                  // The `form` attribute submits the hidden form below even
                  // though this button sits inside the address-creation form.
                  form="quick-payment"
                  className="border border-brand px-8 py-3.5 text-sm text-brand-deep hover:bg-brand-soft/40"
                >
                  Proceed to Payment
                </button>
              )}
            </div>
          </form>

          {quickAddress && (
            <form id="quick-payment" action={selectAddress} className="hidden">
              <input type="hidden" name="addressId" value={quickAddress.id} />
            </form>
          )}
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

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="mt-5 block">
      <span className="text-xs text-muted">{label}</span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-brand"
      />
    </label>
  );
}
