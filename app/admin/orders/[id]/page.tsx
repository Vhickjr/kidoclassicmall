import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { koboToNaira } from "@/lib/format";
import { setOrderStatus } from "@/app/_actions/admin";
import SubmitButton from "@/app/_components/submit-button";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  // The gate has to sit here, not only in the layout. A layout returning early
  // does not stop its child page running, and the page's output still reaches
  // the client in the RSC payload — customer emails included.
  if (!(await requireAdmin())) return null;

  const { id } = await params;

  const order = await getPrisma().order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) notFound();

  return (
    <div>
      <Link href="/admin/orders" className="text-sm underline">
        Back to orders
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {koboToNaira(order.totalKobo)}
      </h1>
      <p className="mt-1 font-mono text-xs text-muted">{order.id}</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div>
          <h2 className="font-semibold">Items</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{item.productName}</span>
                  <span className="text-muted">
                    {item.size}
                    {item.color ? ` · ${item.color}` : ""} · qty {item.quantity}
                  </span>
                </span>
                <span>{koboToNaira(item.priceKobo * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-8 font-semibold">Totals</h2>
          <dl className="mt-3 max-w-sm text-sm">
            <Row label="Subtotal" value={koboToNaira(order.subtotalKobo)} />
            {order.discountKobo > 0 && (
              <Row
                label={`Discount${order.discountCode ? ` (${order.discountCode})` : ""}`}
                value={`−${koboToNaira(order.discountKobo)}`}
              />
            )}
            <Row
              label="Delivery"
              value={
                order.deliveryKobo === 0
                  ? "Free"
                  : koboToNaira(order.deliveryKobo)
              }
            />
            <Row
              label="Total"
              value={koboToNaira(order.totalKobo)}
              emphasis
            />
          </dl>

          <h2 className="mt-8 font-semibold">Customer</h2>
          <p className="mt-3 text-sm text-muted">
            {order.email}
            {order.phone ? ` · ${order.phone}` : ""}
          </p>

          <h2 className="mt-8 font-semibold">Shipping</h2>
          <p className="mt-3 text-sm text-muted">
            {order.recipientName ?? "No name"}
            <br />
            {order.addressLine ?? "No address"}
            {order.line2 ? `, ${order.line2}` : ""}
            <br />
            {order.city ?? ""}
            {order.state ? `, ${order.state}` : ""}
            {order.postalCode ? ` ${order.postalCode}` : ""}
          </p>
        </div>

        <aside className="h-fit border border-line p-5">
          <h2 className="font-semibold">Status</h2>
          <p className="mt-2 text-sm text-muted">
            Currently <strong className="text-foreground">{order.status}</strong>
          </p>

          <form action={setOrderStatus} className="mt-5">
            <input type="hidden" name="orderId" value={order.id} />
            <select
              name="status"
              defaultValue={order.status}
              aria-label="Order status"
              className="w-full border border-line px-3 py-2.5 text-sm"
            >
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FULFILLED">Fulfilled</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <SubmitButton variant="primary" className="mt-3 w-full">Update status</SubmitButton>
          </form>

          <p className="mt-5 text-xs text-muted">
            Moving a paid order to Cancelled or Refunded puts its stock back.
            Marking an order Paid by hand does not take stock — only the payment
            webhook does that.
          </p>

          <dl className="mt-5 border-t border-line pt-5 text-sm">
            <Row label="Method" value={order.paymentMethod ?? "—"} />
            <Row label="Reference" value={order.paymentRef ?? "—"} />
            <Row
              label="Paid at"
              value={
                order.paidAt
                  ? order.paidAt.toLocaleString("en-NG")
                  : "Not paid"
              }
            />
          </dl>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 py-1.5 ${
        emphasis ? "mt-1.5 border-t border-line pt-3 font-semibold" : ""
      }`}
    >
      <dt className={emphasis ? "" : "text-muted"}>{label}</dt>
      <dd className="break-all text-right">{value}</dd>
    </div>
  );
}
