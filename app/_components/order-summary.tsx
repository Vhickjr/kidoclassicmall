import type { Totals } from "@/lib/checkout";
import { applyDiscount } from "@/app/_actions/checkout";
import Money from "@/app/_components/money";

export default function OrderSummary({
  totals,
  appliedCode,
  attemptedCode,
  children,
}: {
  totals: Totals;
  appliedCode: string | null;
  attemptedCode?: string;
  children?: React.ReactNode;
}) {
  const codeRejected = Boolean(attemptedCode) && !appliedCode;

  return (
    <aside className="h-fit border border-line p-6">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Subtotal</span>
        <span className="font-semibold"><Money kobo={totals.subtotalKobo} /></span>
      </div>

      <form action={applyDiscount} className="mt-6">
        <label className="block text-xs text-muted" htmlFor="discount-code">
          Enter Discount Code
        </label>
        <div className="mt-1.5 flex">
          <input
            id="discount-code"
            name="code"
            defaultValue={attemptedCode ?? ""}
            placeholder="FLAT50"
            className="min-w-0 flex-1 border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="bg-brand px-5 py-2.5 text-sm text-white"
          >
            Apply
          </button>
        </div>
        {codeRejected && (
          <p className="mt-2 text-xs text-red-600">That code is not valid.</p>
        )}
      </form>

      {totals.discountKobo > 0 && (
        <div className="mt-5 flex items-center justify-between text-sm">
          <span>Discount {appliedCode ? `(${appliedCode})` : ""}</span>
          <span className="text-green-700">
            &minus;<Money kobo={totals.discountKobo} />
          </span>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between text-sm">
        <span>Delivery Charge</span>
        <span>
          {totals.deliveryKobo === 0 ? (
            "Free"
          ) : (
            <Money kobo={totals.deliveryKobo} />
          )}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-5">
        <span className="font-semibold">Grand Total</span>
        <span className="font-semibold"><Money kobo={totals.totalKobo} /></span>
      </div>

      {children}
    </aside>
  );
}
