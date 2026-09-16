"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { CART_COOKIE, cartSubtotalKobo, readCart, readSessionId } from "@/lib/cart";
import { koboToNaira } from "@/lib/format";
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
  const totals = totalsFor(subtotalKobo, discount.amountKobo);

  const prisma = getPrisma();
  const sessionId = await readSessionId();

  const order = await prisma.order.create({
    data: {
      sessionId,
      email,
      phone: address.phone,
      status: "PENDING",
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
    },
  });

  await prisma.notification.create({
    data: {
      sessionId,
      kind: "order-placed",
      title: "Your order was placed",
      body: `Order ${order.id.slice(-8)} for ${koboToNaira(totals.totalKobo)}.`,
    },
  });

  // The cart is emptied so a refresh cannot place the same order twice.
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  revalidatePath("/", "layout");

  // Cash on delivery is settled in person, so it skips the payment window and
  // the order simply waits for staff to mark it paid.
  if (state.paymentMethod === "cash-on-delivery") {
    redirect(`/checkout/confirmed?order=${order.id}`);
  }

  redirect(`/checkout/pay/${order.id}`);
}
