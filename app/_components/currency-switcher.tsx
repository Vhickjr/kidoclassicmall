"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";
import type { DisplayCurrency } from "@/lib/currency";
import { setCurrency } from "@/app/_actions/currency";

export default function CurrencySwitcher({
  currencies,
  current,
}: {
  currencies: DisplayCurrency[];
  current: string;
}) {
  const [pending, startTransition] = useTransition();

  // Nothing to switch between until a second currency is added in the admin.
  if (currencies.length < 2) return null;

  return (
    <label className="flex items-center gap-1.5 text-sm text-muted">
      <Globe aria-hidden className="size-4" />
      <span className="sr-only">Currency</span>
      <select
        defaultValue={current}
        disabled={pending}
        onChange={(event) => {
          const body = new FormData();
          body.append("code", event.target.value);
          startTransition(async () => {
            await setCurrency(body);
          });
        }}
        className="border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-brand disabled:opacity-50"
      >
        {currencies.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.code}
          </option>
        ))}
      </select>
    </label>
  );
}
