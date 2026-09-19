import type { Metadata } from "next";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { koboToNaira } from "@/lib/format";
import {
  RevenueChart,
  StatusChart,
  type RevenuePoint,
  type StatusSlice,
} from "@/app/_components/admin-charts";

export const metadata: Metadata = { title: "Admin dashboard" };

const LOW_STOCK_AT = 3;

export default async function AdminDashboardPage() {
  // The gate has to sit here, not only in the layout. A layout returning early
  // does not stop its child page running, and the page's output still reaches
  // the client in the RSC payload — customer emails included.
  if (!(await requireAdmin())) return null;

  const prisma = getPrisma();

  const [paidOrders, pendingCount, productCount, publishedCount, lowStock, recent] =
    await Promise.all([
      prisma.order.findMany({
        where: { status: { in: ["PAID", "FULFILLED"] } },
        select: { totalKobo: true },
      }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.product.count(),
      prisma.product.count({ where: { status: "PUBLISHED" } }),
      prisma.productVariant.findMany({
        where: { stock: { lte: LOW_STOCK_AT }, product: { status: "PUBLISHED" } },
        include: { product: true },
        orderBy: { stock: "asc" },
        take: 10,
      }),
      prisma.order.findMany({
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const revenue = paidOrders.reduce((total, order) => total + order.totalKobo, 0);

  // Fourteen days of paid revenue, bucketed by day. Read once and grouped here
  // rather than fourteen separate COUNT queries.
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const [recentPaid, statusCounts] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { in: ["PAID", "FULFILLED"] },
        // Either date qualifies: orders settled by hand before paidAt was being
        // stamped have only createdAt, and dropping them would understate revenue.
        OR: [{ paidAt: { gte: since } }, { paidAt: null, createdAt: { gte: since } }],
      },
      select: { paidAt: true, createdAt: true, totalKobo: true },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const byDay = new Map<string, number>();
  for (const order of recentPaid) {
    const when = order.paidAt ?? order.createdAt;
    const key = when.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + order.totalKobo);
  }

  const points: RevenuePoint[] = Array.from({ length: 14 }, (_, index) => {
    const day = new Date(since);
    day.setDate(since.getDate() + index);
    const key = day.toISOString().slice(0, 10);

    return {
      day: key,
      label: day.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
      totalKobo: byDay.get(key) ?? 0,
    };
  });

  const countFor = (status: string) =>
    statusCounts.find((row) => row.status === status)?._count._all ?? 0;

  const slices: StatusSlice[] = [
    { key: "PENDING", label: "Awaiting payment", count: countFor("PENDING") },
    { key: "PAID", label: "Paid", count: countFor("PAID") },
    { key: "FULFILLED", label: "Fulfilled", count: countFor("FULFILLED") },
    {
      key: "CLOSED",
      label: "Cancelled or refunded",
      count: countFor("CANCELLED") + countFor("REFUNDED"),
    },
  ].filter((slice) => slice.count > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue (paid)" value={koboToNaira(revenue)} />
        <Stat label="Paid orders" value={String(paidOrders.length)} />
        <Stat label="Awaiting payment" value={String(pendingCount)} />
        <Stat
          label="Products"
          value={`${publishedCount} live / ${productCount}`}
        />
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <RevenueChart points={points} />
        <StatusChart slices={slices} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Low stock</h2>
            <Link href="/admin/products" className="text-sm underline">
              All products
            </Link>
          </div>

          {lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Nothing is running low.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {lowStock.map((variant) => (
                <li
                  key={variant.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate">
                      {variant.product.name}
                    </span>
                    <span className="text-muted">
                      {variant.size}
                      {variant.color ? ` · ${variant.color}` : ""}
                    </span>
                  </span>
                  <span
                    className={
                      variant.stock === 0
                        ? "shrink-0 text-red-600"
                        : "shrink-0 text-amber-600"
                    }
                  >
                    {variant.stock === 0 ? "Sold out" : `${variant.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm underline">
              All orders
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {recent.map((order) => (
                <li key={order.id} className="py-3 text-sm">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-4 hover:text-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{order.email}</span>
                      <span className="text-muted">
                        {order.items.length}{" "}
                        {order.items.length === 1 ? "item" : "items"} ·{" "}
                        {order.status}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold">
                      {koboToNaira(order.totalKobo)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-10 rounded border border-dashed border-line px-3 py-2 text-xs text-muted">
        Revenue counts orders marked PAID or FULFILLED. Since ALAT Pay is not
        connected, nothing reaches those states on its own yet — set a status by
        hand on an order to see the figures move.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <li className="border border-line p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </li>
  );
}
