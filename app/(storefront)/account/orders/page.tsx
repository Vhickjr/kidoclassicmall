import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { readSessionId } from "@/lib/cart";
import Money from "@/app/_components/money";

export const metadata: Metadata = { title: "My Orders" };

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-blue-100 text-blue-800",
  FULFILLED: "bg-green-100 text-green-800",
  CANCELLED: "bg-line text-muted",
  REFUNDED: "bg-line text-muted",
};

const STATUS_COPY: Record<string, string> = {
  PENDING: "Waiting for payment",
  PAID: "Paid, being prepared",
  FULFILLED: "Your order has been delivered",
  CANCELLED: "This order was cancelled",
  REFUNDED: "This order was refunded",
};

export default async function MyOrdersPage() {
  const sessionId = await readSessionId();

  const orders = sessionId
    ? await getPrisma().order.findMany({
        where: { sessionId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {/* Order search and filtering are not built yet. */}
        <span className="flex items-center gap-2 border border-line px-4 py-2.5 text-sm text-muted">
          <Search aria-hidden className="size-4" />
          Search
        </span>
        <span className="flex items-center gap-2 bg-brand px-5 py-2.5 text-sm text-white">
          Filter
          <SlidersHorizontal aria-hidden className="size-4" />
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="mt-8 border border-line p-10 text-center">
          <p className="text-muted">You have no orders yet.</p>
          <Link
            href="/shop"
            className="mt-6 inline-block bg-brand px-6 py-3 text-sm text-white"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line border-t border-line">
          {orders.map((order) => (
            <li key={order.id} className="py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-muted">{order.id}</p>
                  <p className="mt-1 text-sm text-muted">
                    {order.createdAt.toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <p className="font-semibold"><Money kobo={order.totalKobo} /></p>
              </div>

              <ul className="mt-4 space-y-2">
                {order.items.map((item) => (
                  <li key={item.id} className="text-sm">
                    <span className="font-semibold">{item.productName}</span>
                    <span className="text-muted">
                      {" · "}Size: {item.size}
                      {item.color ? ` · ${item.color}` : ""}
                      {" · "}Qty: {item.quantity}
                      {" · "}
                      <Money kobo={item.priceKobo} />
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 flex items-center gap-3 text-sm">
                <span
                  className={`px-2 py-1 text-xs ${
                    STATUS_STYLE[order.status] ?? "bg-line text-muted"
                  }`}
                >
                  {order.status}
                </span>
                <span className="text-muted">{STATUS_COPY[order.status]}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 rounded border border-dashed border-line px-3 py-2 text-xs text-muted">
        These are the orders placed from this browser. Once logins exist they
        will be tied to your account instead.
      </p>
    </div>
  );
}
