import type { Metadata } from "next";
import { RefreshCw, Trash2 } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  deleteCurrency,
  refreshExchangeRates,
  toggleCurrency,
  toggleCurrencyAutoRate,
  upsertCurrency,
} from "@/app/_actions/admin";
import SubmitButton from "@/app/_components/submit-button";

export const metadata: Metadata = { title: "Currencies" };

export default async function AdminCurrenciesPage() {
  if (!(await requireAdmin())) return null;

  const currencies = await getPrisma().currency.findMany({
    orderBy: { code: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Currencies</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Shoppers can switch the storefront into any currency listed here. Prices
        are still stored and <strong>charged in naira</strong> — these rates only
        change what a customer reads, never what they are billed. Naira is always
        available and does not need adding.
      </p>

      <form action={refreshExchangeRates} className="mt-6">
        <SubmitButton variant="primary"><RefreshCw aria-hidden className="size-4" />
          Update rates from the live feed</SubmitButton>
      </form>
      <p className="mt-2 text-xs text-muted">
        Rates continuously and automatically update in the background every hour from the live exchange feed.
        You can also click the button above to force an instant refresh anytime. Pinned rates are left untouched.
      </p>

      <form action={upsertCurrency} className="mt-8 flex max-w-3xl flex-wrap gap-3">
        <label className="w-28">
          <span className="text-xs text-muted">Code</span>
          <input
            name="code"
            required
            maxLength={3}
            placeholder="USD"
            className="mt-1.5 w-full border border-line px-3 py-2.5 text-sm uppercase outline-none focus:border-brand"
          />
        </label>
        <label className="w-24">
          <span className="text-xs text-muted">Symbol</span>
          <input
            name="symbol"
            required
            placeholder="$"
            className="mt-1.5 w-full border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="min-w-40 flex-1">
          <span className="text-xs text-muted">Name</span>
          <input
            name="name"
            required
            placeholder="US Dollar"
            className="mt-1.5 w-full border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="w-44">
          <span className="text-xs text-muted">Units per &#8358;1</span>
          <input
            name="unitsPerNaira"
            required
            placeholder="0.00065"
            className="mt-1.5 w-full border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input
            type="checkbox"
            name="autoRate"
            defaultChecked
            className="size-4 accent-brand"
          />
          Follow live rate
        </label>
        <SubmitButton variant="primary" className="self-end">Save</SubmitButton>
      </form>

      <p className="mt-2 text-xs text-muted">
        If &#8358;1 is worth $0.00065, enter 0.00065. Saving a code that already
        exists updates its rate.
      </p>

      {currencies.length === 0 ? (
        <p className="mt-8 text-muted">
          No extra currencies yet, so the switcher stays hidden on the storefront.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {currencies.map((currency) => (
            <li
              key={currency.id}
              className="flex flex-wrap items-center gap-4 py-4"
            >
              <p className="w-16 font-mono text-sm font-semibold">
                {currency.code}
              </p>
              <p className="min-w-40 flex-1 text-sm text-muted">
                {currency.symbol} {currency.name}
              </p>
              <p className="text-sm">
                &#8358;1 = {currency.unitsPerNaira} {currency.code}
                <span className="ml-2 text-xs text-muted">
                  {currency.autoRate
                    ? currency.rateUpdatedAt
                      ? `live · auto-updated ${currency.rateUpdatedAt.toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}`
                      : "live · auto-updating..."
                    : "pinned"}
                </span>
              </p>

              <form action={toggleCurrencyAutoRate}>
                <input type="hidden" name="currencyId" value={currency.id} />
                <SubmitButton variant="bare">{currency.autoRate ? "Pin rate" : "Follow live"}</SubmitButton>
              </form>
              <span
                className={`px-2 py-1 text-xs ${
                  currency.active
                    ? "bg-green-100 text-green-800"
                    : "bg-line text-muted"
                }`}
              >
                {currency.active ? "Shown" : "Hidden"}
              </span>

              <form action={toggleCurrency}>
                <input type="hidden" name="currencyId" value={currency.id} />
                <SubmitButton variant="bare">{currency.active ? "Hide" : "Show"}</SubmitButton>
              </form>

              <form action={deleteCurrency}>
                <input type="hidden" name="currencyId" value={currency.id} />
                <SubmitButton variant="danger"><Trash2 aria-hidden className="size-3.5" />
                  Delete</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
