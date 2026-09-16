import { NextResponse } from "next/server";
import { readSessionId } from "@/lib/cart";
import { getPrisma } from "@/lib/prisma";
import { confirmAndFulfilOrder } from "@/lib/alatpay";

/**
 * Called by the browser after ALAT Pay's popup reports a transaction.
 *
 * The body is a claim, not proof — anyone can POST here. It is only used to
 * learn which transaction to ask ALAT Pay about; the answer decides everything.
 */
export async function POST(request: Request) {
  let body: { orderId?: string; transactionId?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const orderId = String(body.orderId ?? "");
  const transactionId = String(body.transactionId ?? "");

  if (!orderId || !transactionId) {
    return NextResponse.json({ error: "Missing details." }, { status: 400 });
  }

  // Only the shopper who placed the order may push it forward from a browser.
  const sessionId = await readSessionId();
  const order = await getPrisma().order.findUnique({
    where: { id: orderId },
    select: { sessionId: true },
  });

  if (!order || !sessionId || order.sessionId !== sessionId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const result = await confirmAndFulfilOrder(orderId, transactionId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 402 });
  }

  return NextResponse.json({ paid: true });
}
