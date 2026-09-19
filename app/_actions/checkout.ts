"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { CART_COOKIE, cartSubtotalKobo, readCart, readSessionId } from "@/lib/cart";
import { koboToNaira } from "@/lib/format";
import { storeSettings } from "@/lib/settings-store";
import { after } from "next/server";
import { sendOrderReceipt } from "@/lib/mail";
import {
  CHECKOUT_COOKIE,
  type CheckoutState,
  type PaymentMethod,
  PAYMENT_METHODS,
  discountFor,
  readCheckoutState,
  totalsFor,
} from "@/lib/checkout";

const ONE_YEAR = 60 * 60 * 24 * 365;

async function writeCheckoutState(patch: Partial<CheckoutState>) {
  const jar = await cookies();
  const next = { ...(await readCheckoutState()), ...patch };

  jar.set(CHECKOUT_COOKIE, JSON.stringify(next), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

/** Addresses belong to the shopper's cookie, so one has to exist before we can
 *  save anything against it. */
async function sessionForWriting() {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing) return existing;

  const sessionId = randomUUID();
  jar.set(CART_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });

  return sessionId;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function addAddress(formData: FormData) {
  const fullName = text(formData, "fullName");
  const phone = text(formData, "phone");
  const line1 = text(formData, "line1");
  const city = text(formData, "city");
  const state = text(formData, "state");

  if (!fullName || !phone || !line1 || !city || !state) return;

  const sessionId = await sessionForWriting();
  const prisma = getPrisma();
  const makeDefault = formData.get("isDefault") !== null;

  if (makeDefault) {
    await prisma.address.updateMany({
      where: { sessionId },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      sessionId,
      fullName,
      phone,
      line1,
      line2: text(formData, "line2") || null,
      city,
      state,
      postalCode: text(formData, "postalCode") || null,
      isDefault: makeDefault,
    },
  });

  await writeCheckoutState({ addressId: address.id });
  revalidatePath("/", "layout");
}

/** Server actions take direct POSTs, so prove the row belongs to this cookie. */
async function ownedAddress(id: string) {
  const sessionId = await readSessionId();
  if (!sessionId) return null;

  const address = await getPrisma().address.findUnique({ where: { id } });
  return address && address.sessionId === sessionId ? address : null;
}

export async function selectAddress(formData: FormData) {
  const address = await ownedAddress(text(formData, "addressId"));
  if (!address) return;

  await writeCheckoutState({ addressId: address.id });
  redirect("/checkout/payment");
}

export async function deleteAddress(formData: FormData) {
  const address = await ownedAddress(text(formData, "addressId"));
  if (!address) return;

  await getPrisma().address.delete({ where: { id: address.id } });
  revalidatePath("/", "layout");
}

export async function applyDiscount(formData: FormData) {
  await writeCheckoutState({ discountCode: text(formData, "code") || undefined });
  revalidatePath("/", "layout");
}

export async function selectPaymentMethod(formData: FormData) {
  const value = text(formData, "paymentMethod") as PaymentMethod;

  if (!PAYMENT_METHODS.some((method) => method.value === value)) return;

  await writeCheckoutState({ paymentMethod: value });
  redirect("/checkout/review");
}

/**
 * Writes the order. Totals are recomputed here from our own variant rows, so a
 * tampered form cannot change what is charged.
 *
 * Stock is deliberately NOT decremented here. Per the checkout rules that only
 * happens once ALAT Pay confirms the money, inside a transaction — see
 * confirmAndFulfilOrder. An order leaves this function PENDING every time.
 */
export async function placeOrder(formData: FormData) {
  const cart = await readCart();
  if (!cart || cart.items.length === 0) redirect("/cart");

  const email = text(formData, "email");
  if (!email) return;

  const state = await readCheckoutState();
  const address = state.addressId ? await ownedAddress(state.addressId) : null;
  if (!address) redirect("/checkout/address");

  const subtotalKobo = cartSubtotalKobo(cart);
  const discount = await discountFor(state.discountCode, subtotalKobo);
  // Same delivery figures the checkout screens quoted, so what is written to the
  // order matches what the customer was shown.
  const totals = totalsFor(
    subtotalKobo,
    discount.amountKobo,
    await storeSettings()
  );

  const prisma = getPrisma();
  const sessionId = await readSessionId();

  // A shopper who backs out of ALAT Pay and checks out again should not leave
  // a trail of half-finished orders behind her — that would clutter the order
  // list and have the abandoned-checkout mailer chase orders she has already
  // replaced. An unpaid attempt that never reached ALAT Pay is reused, so a
  // session has at most one live pending order.
  const reusable = sessionId
    ? await prisma.order.findFirst({
        where: {
          sessionId,
          status: "PENDING",
          paidAt: null,
          // Once a transaction reference exists money may be in flight against
          // that order, so it is left alone and a fresh one is written.
          paymentRef: null,
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  if (reusable) {
    // Rewritten rather than patched: the basket, address or discount may all
    // have changed since the abandoned attempt.
    await prisma.orderItem.deleteMany({ where: { orderId: reusable.id } });
  }

  const orderData = {
    sessionId,
    email,
    phone: address.phone,
    status: "PENDING" as const,
    subtotalKobo: totals.subtotalKobo,
    discountKobo: totals.discountKobo,
    discountCode: discount.code,
    deliveryKobo: totals.deliveryKobo,
    totalKobo: totals.totalKobo,
    paymentMethod: state.paymentMethod ?? "card",
    recipientName: address.fullName,
    addressLine: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    items: {
      create: cart.items.map((line) => ({
        variantId: line.variantId,
        quantity: line.quantity,
        // Frozen at purchase, so a later price change cannot rewrite history.
        priceKobo: line.variant.priceKobo,
        productName: line.variant.product.name,
        size: line.variant.size,
        color: line.variant.color,
      })),
    },
  };

  const order = reusable
    ? await prisma.order.update({
        where: { id: reusable.id },
        data: orderData,
        include: { items: true },
      })
    : await prisma.order.create({ data: orderData, include: { items: true } });

  // Sent after the response, so a slow or unreachable mail server cannot hold
  // up a customer who has already ordered. `after` still runs even though this
  // action ends in a redirect. A mail failure must never lose the order.
  // Only for a genuinely new order: resuming an abandoned attempt should not
  // send her a second "we got your order" email for the same basket.
  if (!reusable) {
    after(async () => {
      try {
        await sendOrderReceipt(order, "placed");
      } catch (error) {
        console.error("order receipt failed to send", order.id, error);
      }
    });
  }

  if (!reusable) await prisma.notification.create({
    data: {
      sessionId,
      kind: "order-placed",
      title: "Your order was placed",
      body: `Order ${order.id.slice(-8)} for ${koboToNaira(totals.totalKobo)}.`,
    },
  });

  // Placing an order is not paying for one. The basket stays exactly as it is
  // until money actually arrives, so a shopper who closes the ALAT Pay window
  // — or whose card is declined — comes back to a cart that still has her
  // things in it. It is emptied in confirmAndFulfilOrder instead.
  //
  // Cash on delivery is the one exception: there is no online payment step to
  // come back from, so that order is committed here and the basket is done.
  const cashOnDelivery = state.paymentMethod === "cash-on-delivery";

  await prisma.cart.update({
    where: { id: cart.id },
    data: {
      // Kept either way: if this shopper wanders off, it is the only way we
      // can reach a guest to follow up.
      email,
      // This basket is mid-conversion, so an old follow-up stamp must not
      // silence the next one.
      recoveryEmailSentAt: null,
      ...(cashOnDelivery ? { items: { deleteMany: {} } } : {}),
    },
  });

  revalidatePath("/", "layout");

  // Cash on delivery is settled in person, so it skips the payment window and
  // the order simply waits for staff to mark it paid.
  if (cashOnDelivery) {
    redirect(`/checkout/confirmed?order=${order.id}`);
  }

  redirect(`/checkout/pay/${order.id}`);
}
