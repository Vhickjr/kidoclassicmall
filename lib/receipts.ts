import "server-only";
import { getPrisma } from "@/lib/prisma";
import { sendOrderReceipt } from "@/lib/mail";

/**
 * Sends the "payment received" receipt exactly once per order.
 *
 * Guarded by `receiptSentAt` rather than by the caller, because there are two
 * ways an order becomes paid — the ALAT Pay confirmation and an admin marking
 * a cash-on-delivery order settled — and a retried webhook can arrive twice.
 * Claiming the stamp before sending means a duplicate delivery loses the race
 * instead of sending a second receipt.
 *
 * Never call this inside a transaction: it talks to an SMTP server, which would
 * hold a database connection open for the length of a network round trip.
 */
export async function sendPaidReceiptOnce(orderId: string): Promise<void> {
  const prisma = getPrisma();

  try {
    // Only the caller that flips null -> now() gets to send.
    const claimed = await prisma.order.updateMany({
      where: { id: orderId, receiptSentAt: null },
      data: { receiptSentAt: new Date() },
    });

    if (claimed.count === 0) return;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return;

    await sendOrderReceipt(order, "paid");
  } catch (error) {
    // A receipt is a courtesy. Never fail a paid order over it.
    console.error("paid receipt failed to send", orderId, error);
  }
}
