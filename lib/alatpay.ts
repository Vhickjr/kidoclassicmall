import "server-only";
import { getPrisma } from "@/lib/prisma";

/**
 * ALAT Pay, server side.
 *
 * The inline popup collects the card in ALAT Pay's own iframe, so no card number
 * or CVV ever reaches this app. What comes back to us is a transaction id.
 *
 * That id arrives from two untrustworthy places — the browser's onTransaction
 * callback, and an unsigned callback to our webhook URL. ALAT Pay publishes no
 * webhook signature scheme, so neither payload is evidence of anything. Both
 * routes therefore do the same thing: ask ALAT Pay directly, over the server's
 * own authenticated connection, and believe only that answer.
 */
const BASE_URL = process.env.ALATPAY_BASE_URL ?? "https://apibox.alatpay.ng";

/**
 * The one value to check against your merchant portal. ALAT Pay's public docs
 * do not publish the REST path the SDKs wrap, so this is the single place to
 * correct if the first live transaction 404s.
 */
const CONFIRM_PATH = "/bank-transfer/api/v1/bankTransfer/transactions";

export type ConfirmedTransaction = {
  ok: true;
  status: string;
  paid: boolean;
  amountKobo: number | null;
  orderId: string | null;
};

export type ConfirmFailure = { ok: false; error: string };

function subscriptionKey(): string | null {
  return process.env.ALATPAY_SECRET_KEY ?? null;
}

export function isAlatpayConfigured(): boolean {
  return Boolean(
    subscriptionKey() &&
      process.env.NEXT_PUBLIC_ALATPAY_API_KEY &&
      process.env.NEXT_PUBLIC_ALATPAY_BUSINESS_ID
  );
}

/** ALAT Pay quotes money in naira; everything here is kobo. */
function toKobo(value: unknown): number | null {
  const amount = typeof value === "string" ? Number(value) : value;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export async function confirmTransaction(
  transactionId: string
): Promise<ConfirmedTransaction | ConfirmFailure> {
  const key = subscriptionKey();
  if (!key) return { ok: false, error: "ALAT Pay is not configured." };

  let response: Response;
  try {
    response = await fetch(
      `${BASE_URL}${CONFIRM_PATH}/${encodeURIComponent(transactionId)}`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error("alatpay confirm request failed", transactionId, error);
    return { ok: false, error: "Could not reach ALAT Pay." };
  }

  if (!response.ok) {
    console.error("alatpay confirm returned", response.status, transactionId);
    return { ok: false, error: `ALAT Pay returned ${response.status}.` };
  }

  const body = await response.json().catch(() => null);
  const data = body?.data ?? body;

  if (!data) return { ok: false, error: "Unreadable response from ALAT Pay." };

  const status = String(data.status ?? data.transactionStatus ?? "").toLowerCase();

  return {
    ok: true,
    status,
    // ALAT Pay uses "completed" for a settled transfer and "successful" for a
    // completed card charge; treat either as paid.
    paid: status === "completed" || status === "successful" || status === "success",
    amountKobo: toKobo(data.amount),
    orderId: data.orderId ?? data.orderid ?? null,
  };
}

export type FulfilResult =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; error: string };

/**
 * Confirms with ALAT Pay, then settles the order.
 *
 * Both the browser callback and the webhook funnel through here, so the rules
 * hold no matter which arrives first, or twice:
 *
 *  - the amount ALAT Pay confirms must equal what we billed, or a tampered
 *    popup amount could buy a full basket for a naira;
 *  - stock moves once, inside a transaction, guarded in the WHERE clause;
 *  - a second call is a no-op rather than a second decrement.
 */
export async function confirmAndFulfilOrder(
  orderId: string,
  transactionId: string
): Promise<FulfilResult> {
  const prisma = getPrisma();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) return { ok: false, error: "Unknown order." };
  if (order.status !== "PENDING") return { ok: true, alreadyPaid: true };

  const confirmation = await confirmTransaction(transactionId);
  if (!confirmation.ok) return { ok: false, error: confirmation.error };

  if (!confirmation.paid) {
    return { ok: false, error: `Payment is ${confirmation.status || "unconfirmed"}.` };
  }

  if (
    confirmation.amountKobo !== null &&
    confirmation.amountKobo !== order.totalKobo
  ) {
    console.error(
      "alatpay amount mismatch",
      orderId,
      "billed",
      order.totalKobo,
      "confirmed",
      confirmation.amountKobo
    );
    return { ok: false, error: "The amount paid does not match this order." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });

      // Re-checked inside the transaction: the webhook and the browser can land
      // at the same moment.
      if (!fresh || fresh.status !== "PENDING") return;

      for (const item of order.items) {
        const taken = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (taken.count === 0) {
          throw new Error(
            `Out of stock for order ${orderId}: ${item.productName} ${item.size}`
          );
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paymentRef: transactionId,
          paidAt: new Date(),
        },
      });

      await tx.notification.create({
        data: {
          sessionId: order.sessionId,
          userId: order.userId,
          kind: "order-placed",
          title: "Payment received",
          body: `Order ${orderId.slice(-8)} is paid and being prepared.`,
        },
      });
    });
  } catch (error) {
    console.error("alatpay fulfilment failed", orderId, error);
    return { ok: false, error: "Could not complete this order." };
  }

  return { ok: true, alreadyPaid: false };
}
