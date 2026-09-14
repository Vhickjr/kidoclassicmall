import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

/**
 * ALAT Pay payment confirmation.
 *
 * Three things here are deliberate, and all three come from the checkout rules
 * in SETUP.md:
 *
 * 1. Only a signed webhook may mark an order paid. The browser redirect back
 *    from a payment page can be forged, so it must never be trusted for this.
 * 2. Stock moves here and nowhere else, inside one transaction, guarded so two
 *    buyers cannot both take the last size 38.
 * 3. Confirming twice is harmless, because webhooks retry.
 *
 * STILL TO CONFIRM against ALAT Pay's documentation: the signature header name,
 * the digest algorithm, and where the order id and reference sit in the payload.
 * The three constants below are the placeholders to correct.
 */
const SIGNATURE_HEADER = "x-alatpay-signature";
const SIGNATURE_ALGORITHM = "sha512";
const SUCCESS_STATUS = "successful";

function signatureMatches(raw: string, provided: string, secret: string) {
  const expected = createHmac(SIGNATURE_ALGORITHM, secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);

  // Length must match before timingSafeEqual, which throws on a mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.ALATPAY_WEBHOOK_SECRET;

  // Fail closed. Without a secret we cannot tell a real callback from a forged
  // one, and accepting a forged one would hand out free orders.
  if (!secret) {
    return NextResponse.json(
      { error: "Payment webhook is not configured." },
      { status: 503 }
    );
  }

  const raw = await request.text();
  const provided = request.headers.get(SIGNATURE_HEADER) ?? "";

  if (!signatureMatches(raw, provided, secret)) {
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }

  let payload: {
    status?: string;
    reference?: string;
    data?: { reference?: string; status?: string; metadata?: { orderId?: string } };
  };

  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  const orderId = payload.data?.metadata?.orderId;
  const reference = payload.data?.reference ?? payload.reference;
  const status = payload.data?.status ?? payload.status;

  if (!orderId || !reference) {
    return NextResponse.json({ error: "Missing order reference." }, { status: 400 });
  }

  if (status !== SUCCESS_STATUS) {
    // Nothing to do for a failed attempt; the order stays PENDING.
    return NextResponse.json({ received: true });
  }

  try {
    await confirmPaidOrder(orderId, reference);
  } catch (error) {
    console.error("payment confirmation failed", orderId, error);
    // A non-2xx tells ALAT Pay to retry, which is what we want if our own
    // database was briefly unavailable.
    return NextResponse.json({ error: "Could not confirm." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function confirmPaidOrder(orderId: string, reference: string) {
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new Error(`Unknown order ${orderId}`);

    // Idempotency: a retried webhook must not decrement stock a second time.
    if (order.status !== "PENDING") return;

    for (const item of order.items) {
      // The stock guard lives in the WHERE clause so the check and the
      // decrement are one atomic statement. A plain read-then-write here would
      // let two simultaneous confirmations both pass the check.
      const taken = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });

      if (taken.count === 0) {
        // Rolls back every decrement already made in this transaction.
        throw new Error(
          `Out of stock for order ${orderId}: ${item.productName} ${item.size}`
        );
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID", paymentRef: reference, paidAt: new Date() },
    });
  });
}
