import type { Metadata } from "next";
import { Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { addressBook } from "@/lib/checkout";
import { addAddress, deleteAddress } from "@/app/_actions/checkout";
import { updateAddress } from "@/app/_actions/account";
import { NIGERIAN_STATES } from "@/lib/places";

export const metadata: Metadata = { title: "Manage Addresses" };

export default async function ManageAddressesPage({
  searchParams,
}: PageProps<"/account/addresses">) {
  const params = await searchParams;
  const adding = params.add !== undefined;
  const editingId = typeof params.edit === "string" ? params.edit : null;

  const addresses = await addressBook();
  const editing = addresses.find((address) => address.id === editingId) ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-semibold">Manage Addresses</h2>
        <a
          href="/account/addresses?add"
          className="flex items-center gap-2 bg-brand px-6 py-3 text-sm text-white"
        >
          <Plus aria-hidden className="size-4" />
          Add New Address
        </a>
      </div>

      {(adding || editing) && (
        <AddressForm address={editing} />
      )}

      {addresses.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No saved addresses yet.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-t border-line">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex flex-wrap items-start justify-between gap-4 py-6"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {address.fullName}
                  {address.isDefault && (
                    <span className="ml-2 bg-line px-2 py-0.5 align-middle text-xs text-muted">
                      Default
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                  {address.state}
                  {address.postalCode ? ` ${address.postalCode}` : ""}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                  <Phone aria-hidden className="size-3.5" />
                  {address.phone}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                <a
                  href={`/account/addresses?edit=${address.id}`}
                  className="flex items-center justify-center gap-1.5 bg-brand-soft/60 px-5 py-2 text-sm hover:bg-line"
                >
                  <Pencil aria-hidden className="size-3.5" />
                  Edit
                </a>

                <form action={deleteAddress}>
                  <input type="hidden" name="addressId" value={address.id} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-1.5 bg-red-50 px-5 py-2 text-sm text-red-600 hover:bg-red-100"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Address = Awaited<ReturnType<typeof addressBook>>[number];

function AddressForm({ address }: { address: Address | null }) {
  return (
    <div className="mt-8 border border-line p-6">
      <h3 className="font-semibold">
        {address ? "Edit address" : "Add a new address"}
      </h3>

      <form
        action={address ? updateAddress : addAddress}
        className="mt-5 max-w-xl"
      >
        {address && (
          <input type="hidden" name="addressId" value={address.id} />
        )}

        <Field label="Name" name="fullName" defaultValue={address?.fullName} required />
        <Field
          label="Mobile Number"
          name="phone"
          defaultValue={address?.phone}
          required
        />
        <Field
          label="Flat, House no., Building, Company, Apartment"
          name="line1"
          defaultValue={address?.line1}
          required
        />
        <Field
          label="Area, Colony, Street, Sector, Village"
          name="line2"
          defaultValue={address?.line2 ?? ""}
        />
        <Field label="City" name="city" defaultValue={address?.city} required />

        <label className="mt-5 block">
          <span className="text-xs text-muted">State</span>
          <select
            name="state"
            required
            defaultValue={address?.state ?? ""}
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

        <Field
          label="Postcode"
          name="postalCode"
          defaultValue={address?.postalCode ?? ""}
        />

        <label className="mt-5 flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={address?.isDefault ?? false}
            className="size-4 accent-brand"
          />
          Use as my default address
        </label>

        <div className="mt-6 flex gap-3">
          <a
            href="/account/addresses"
            className="bg-brand-soft/60 px-6 py-3 text-sm hover:bg-line"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="bg-brand px-8 py-3 text-sm text-white"
          >
            {address ? "Save changes" : "Add New Address"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="mt-5 block">
      <span className="text-xs text-muted">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}
