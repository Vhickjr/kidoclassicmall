import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { koboToNaira } from "@/lib/format";
import {
  createDiscount,
  deleteDiscount,
  toggleDiscount,
} from "@/app/_actions/admin";
import SubmitButton from "@/app/_components/submit-button";

export const metadata: Metadata = { title: "Discounts" };

export default async function AdminDiscountsPage() {
  // The gate has to sit here, not only in the layout. A layout returning early
  // does not stop its child page running, and the page's output still reaches
  // the client in the RSC payload — customer emails included.
  if (!(await requireAdmin())) return null;

  const codes = await getPrisma().discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Discount codes</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Set a percentage or a fixed amount, not both. Customers enter the code in
        the checkout summary, and the amount is recalculated server-side from
        this row every time.
      </p>

      <form action={createDiscount} className="mt-8 flex max-w-3xl flex-wrap gap-3">
        <label className="min-w-32 flex-1">
          <span className="text-xs text-muted">Code</span>
          <input
            name="code"
            required
            placeholder="FLAT10"
            className="mt-1.5 w-full border border-line px-4 py-2.5 text-sm uppercase outline-none focus:border-brand"
          />
        </label>
        <label className="w-32">
          <span className="text-xs text-muted">Percent off</span>
          <input
            name="percentOff"
            type="number"
            min={1}
            max={100}
            placeholder="10"
            className="mt-1.5 w-full border border-line px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <label className="w-36">
          <span className="text-xs text-muted">Or amount (₦)</span>
          <input
            name="amountOff"
            placeholder="2500"
            className="mt-1.5 w-full border border-line px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <SubmitButton variant="primary" className="self-end">Create</SubmitButton>
      </form>

      {codes.length === 0 ? (
        <p className="mt-8 text-muted">No codes yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {codes.map((code) => (
            <li key={code.id} className="flex flex-wrap items-center gap-4 py-4">
              <p className="min-w-32 font-mono text-sm font-semibold">
                {code.code}
              </p>

              <p className="min-w-32 flex-1 text-sm text-muted">
                {code.percentOff !== null
                  ? `${code.percentOff}% off`
                  : code.amountOffKobo !== null
                    ? `${koboToNaira(code.amountOffKobo)} off`
                    : "No value set"}
              </p>

              <span
                className={`px-2 py-1 text-xs ${
                  code.active
                    ? "bg-green-100 text-green-800"
                    : "bg-line text-muted"
                }`}
              >
                {code.active ? "Active" : "Paused"}
              </span>

              <form action={toggleDiscount}>
                <input type="hidden" name="discountId" value={code.id} />
                <SubmitButton variant="bare">{code.active ? "Pause" : "Activate"}</SubmitButton>
              </form>

              <form action={deleteDiscount}>
                <input type="hidden" name="discountId" value={code.id} />
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
