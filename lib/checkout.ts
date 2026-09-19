import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";
import { cartSubtotalKobo, readCart, readSessionId } from "@/lib/cart";
import { storeSettings } from "@/lib/settings-store";

export const CHECKOUT_COOKIE = "kido_checkout";

/** Fallbacks only. The live figures come from StoreSettings, editable in the
 *  admin — see DEFAULT_STORE_SETTINGS, which these mirror. */
export const DELIVERY_FLAT_KOBO = 250_000;
export const FREE_DELIVERY_OVER_KOBO = 15_000_000;

export const PAYMENT_METHODS = [
  { value: "card", label: "Debit/Credit Card" },
  { value: "google-pay", label: "Google Pay" },
  { value: "paypal", label: "Paypal" },
  { value: "cash-on-delivery", label: "Cash on Delivery" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export type CheckoutState = {
  addressId?: string;
  paymentMethod?: PaymentMethod;
  discountCode?: string;
};

export async function readCheckoutState(): Promise<CheckoutState> {
  const jar = await cookies();
  const raw = jar.get(CHECKOUT_COOKIE)?.value;

  if (!raw) return {};

  try {
    return JSON.parse(raw) as CheckoutState;
  } catch {
    // A malformed cookie should restart checkout, not crash the page.
    return {};
  }
}

export type Totals = {
  subtotalKobo: number;
  discountKobo: number;
  deliveryKobo: number;
  totalKobo: number;
};

/** The single place any money figure is derived. Pages display these; the order
 *  writer calls the same function, so what a customer sees is what gets stored. */
export function totalsFor(
  subtotalKobo: number,
  discountKobo: number,
  delivery: { deliveryFlatKobo: number; freeDeliveryOverKobo: number } = {
    deliveryFlatKobo: DELIVERY_FLAT_KOBO,
    freeDeliveryOverKobo: FREE_DELIVERY_OVER_KOBO,
  }
): Totals {
  const capped = Math.min(Math.max(0, discountKobo), subtotalKobo);
  const discounted = subtotalKobo - capped;

  const deliveryKobo =
    discounted === 0 || discounted >= delivery.freeDeliveryOverKobo
      ? 0
      : delivery.deliveryFlatKobo;

  return {
    subtotalKobo,
    discountKobo: capped,
    deliveryKobo,
    totalKobo: discounted + deliveryKobo,
  };
}

/** Looks a code up rather than trusting any amount from the browser. */
export async function discountFor(
  code: string | undefined,
  subtotalKobo: number
): Promise<{ code: string | null; amountKobo: number }> {
  if (!code) return { code: null, amountKobo: 0 };

  const row = await getPrisma().discountCode.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  const usable =
    row && row.active && (!row.expiresAt || row.expiresAt > new Date());

  if (!usable) return { code: null, amountKobo: 0 };

  const amount =
    row.percentOff !== null
      ? Math.round((subtotalKobo * row.percentOff) / 100)
      : (row.amountOffKobo ?? 0);

  return { code: row.code, amountKobo: Math.min(amount, subtotalKobo) };
}

/** Everything the three checkout screens need, priced once so the steps cannot
 *  disagree with each other. */
export async function loadCheckout() {
  const cart = await readCart();
  const subtotalKobo = cartSubtotalKobo(cart);
  const state = await readCheckoutState();
  const discount = await discountFor(state.discountCode, subtotalKobo);
  const delivery = await storeSettings();

  return {
    cart,
    state,
    discount,
    totals: totalsFor(subtotalKobo, discount.amountKobo, delivery),
  };
}

export async function addressBook() {
  const sessionId = await readSessionId();
  if (!sessionId) return [];

  return getPrisma().address.findMany({
    where: { sessionId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}
