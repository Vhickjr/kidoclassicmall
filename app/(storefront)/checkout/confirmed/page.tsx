import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { readSessionId } from "@/lib/cart";
import Money from "@/app/_components/money";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function OrderConfirmedPage({
  searchParams,
}: PageProps<"/checkout/confirmed">) {
  const { order: orderId } = await searchParams;
  if (typeof orderId !== "string") notFound();

  const sessionId = await readSessionId();
  const order = await getPrisma().order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  // An order id in a URL is guessable, so only show it to the cookie that placed it.
  if (!order || !sessionId || order.sessionId !== sessionId) notFound();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-20 text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-brand-soft/50">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand">
          <ShoppingBag aria-hidden className="size-6 text-background" />
        </span>
      </div>

      <h1 className="mt-7 text-2xl font-bold tracking-tight">
        Your order is confirmed
      </h1>
      <p className="mt-3 text-sm text-muted">
        Thanks for shopping. Your order has not shipped yet; we will email you
        when it does.
      </p>

      <dl className="mt-8 border border-line p-6 text-left text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Order</dt>
          <dd className="font-mono text-xs">{order.id}</dd>
        </div>
        <div className="mt-3 flex justify-between">
          <dt className="text-muted">Items</dt>
          <dd>{order.items.length}</dd>
        </div>
        <div className="mt-3 flex justify-between">
          <dt className="text-muted">Total</dt>
          <dd className="font-semibold"><Money kobo={order.totalKobo} /></dd>
        </div>
        <div className="mt-3 flex justify-between">
          <dt className="text-muted">Status</dt>
          <dd>{order.status}</dd>
        </div>
      </dl>

      {order.status === "PENDING" && (
        <p className="mt-4 rounded border border-dashed border-line px-3 py-2 text-xs text-muted">
          This order is not paid yet. Stock moves only once payment confirms.
        </p>
      )}

      <div className="mt-8 space-y-3">
        <Link
          href="/account/orders"
          className="block w-full bg-brand py-3.5 text-sm text-white"
        >
          View Order
        </Link>
        <Link
          href="/"
          className="block w-full border border-foreground py-3.5 text-sm"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
