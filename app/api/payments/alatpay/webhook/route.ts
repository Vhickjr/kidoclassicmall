import { NextResponse } from "next/server";
import { confirmAndFulfilOrder } from "@/lib/alatpay";
import { getPrisma } from "@/lib/prisma";

/**
 * ALAT Pay's callback URL, set in the merchant portal.
 *
 * ALAT Pay publishes no signature scheme for this callback, so the body is
 * treated as an unauthenticated hint: it tells us which transaction to look at,
 * and nothing more. The decision to mark an order paid comes from asking ALAT
 * Pay over our own authenticated connection.
 *
 * That is stronger than signature checking would be, because a forged body can
 * at worst make us re-verify a transaction that is not ours and get refused.
 */
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload) {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  const data = payload.data ?? payload;
  const transactionId: string | undefined =
    data.transactionId ?? data.id ?? payload.transactionId;
  const orderIdFromPayload: string | undefined = data.orderId ?? payload.orderId;

  if (!transactionId) {
    return NextResponse.json({ received: true, note: "No transaction id." });
  }

  // Prefer our own record: the order whose reference already matches, or the
  // order named in the payload. Either way the amount is re-checked downstream.
  const prisma = getPrisma();
  const order =
    (orderIdFromPayload
      ? await prisma.order.findUnique({ where: { id: orderIdFromPayload } })
      : null) ??
    (await prisma.order.findFirst({ where: { paymentRef: transactionId } }));

  if (!order) {
    // Acknowledge so ALAT Pay stops retrying something we cannot match.
    console.warn("alatpay webhook for unknown order", transactionId);
    return NextResponse.json({ received: true });
  }

  const result = await confirmAndFulfilOrder(order.id, transactionId);

  if (!result.ok) {
    // A non-2xx asks ALAT Pay to retry, which is what we want if our database
    // or their API was briefly unavailable.
    console.error("alatpay webhook could not settle", order.id, result.error);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
