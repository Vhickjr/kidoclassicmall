import type { Metadata } from "next";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { koboToNaira } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };

const STATUSES = ["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"] as const;

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-blue-100 text-blue-800",
  FULFILLED: "bg-green-100 text-green-800",
  CANCELLED: "bg-line text-muted",
  REFUNDED: "bg-line text-muted",
};

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  // The gate has to sit here, not only in the layout. A layout returning early
  // does not stop its child page running, and the page's output still reaches
  // the client in the RSC payload — customer emails included.
  if (!(await requireAdmin())) return null;

  const params = await searchParams;
  const active = typeof params.status === "string" ? params.status : null;

  const orders = await getPrisma().order.findMany({
    where:
      active && (STATUSES as readonly string[]).includes(active)
        ? { status: active as (typeof STATUSES)[number] }
        : {},
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>

      <nav className="mt-6 flex flex-wrap gap-2">
        <Pill href="/admin/orders" label="All" active={active === null} />
        {STATUSES.map((status) => (
          <Pill
            key={status}
            href={`/admin/orders?status=${status}`}
            label={status}
            active={active === status}
          />
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="mt-8 text-muted">No orders here.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {orders.map((order) => (
            <li key={order.id} className="py-4">
              <Link
                href={`/admin/orders/${order.id}`}
                className="flex flex-wrap items-center gap-4 hover:text-muted"
              >
                <div className="min-w-48 flex-1">
                  <p className="text-sm font-semibold">{order.email}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {order.recipientName ?? "No name"} ·{" "}
                    {order.city ?? "No city"} ·{" "}
                    {order.createdAt.toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>

                <span className="text-sm text-muted">
                  {order.items.length}{" "}
                  {order.items.length === 1 ? "item" : "items"}
                </span>

                <span className="text-sm font-semibold">
                  {koboToNaira(order.totalKobo)}
                </span>

                <span
                  className={`px-2 py-1 text-xs ${
                    STATUS_STYLE[order.status] ?? "bg-line text-muted"
                  }`}
                >
                  {order.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Pill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`border px-4 py-1.5 text-sm ${
        active
          ? "border-brand bg-brand text-white"
          : "border-line text-muted hover:border-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
