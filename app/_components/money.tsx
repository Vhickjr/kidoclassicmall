"use client";

import { formatMoney } from "@/lib/currency";
import { useCurrency } from "@/app/_components/currency-provider";

/** Every customer-facing price goes through this, so switching currency changes
 *  the whole storefront at once. Admin screens stay in naira on purpose. */
export default function Money({
  kobo,
  prefix,
  className,
}: {
  kobo: number;
  prefix?: string;
  className?: string;
}) {
  const currency = useCurrency();
  const text = formatMoney(kobo, currency);

  return <span className={className}>{prefix ? `${prefix} ${text}` : text}</span>;
}
