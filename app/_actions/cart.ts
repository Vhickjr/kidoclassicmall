"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { CART_COOKIE } from "@/lib/cart";

const ONE_YEAR = 60 * 60 * 24 * 365;

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Cookies can only be written from an action or route handler, so the cart row
 *  is created here on the first write rather than while rendering a page. */
async function cartForWriting() {
  const jar = await cookies();
  const prisma = getPrisma();
  const existing = jar.get(CART_COOKIE)?.value;

  if (existing) {
    const cart = await prisma.cart.findUnique({ where: { sessionId: existing } });
    if (cart) return cart;
  }

  const sessionId = randomUUID();
  const cart = await prisma.cart.create({ data: { sessionId } });

  jar.set(CART_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });

  return cart;
}

/** Server actions accept direct POSTs, not just clicks from our own UI, so the
 *  row being edited has to be proven to belong to the caller's cookie. */
async function ownedLine(itemId: string) {
  const jar = await cookies();
  const sessionId = jar.get(CART_COOKIE)?.value;
  if (!sessionId) return null;

  const item = await getPrisma().cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true, variant: true },
  });

  if (!item || item.cart.sessionId !== sessionId) return null;
  return item;
}

function refresh() {
  // The header carries a cart count, so every route under the root layout is stale.
  revalidatePath("/", "layout");
}

export async function addToCart(
  variantId: string,
  quantity: number
): Promise<ActionResult> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, error: "Choose a valid quantity." };
  }

  const prisma = getPrisma();
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant || variant.product.status !== "PUBLISHED") {
    return { ok: false, error: "That item is not available." };
  }

  const cart = await cartForWriting();
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });

  const wanted = (existing?.quantity ?? 0) + quantity;

  // Stock is only decremented when payment confirms, so this is a courtesy
  // check to keep the cart honest, not a reservation.
  if (wanted > variant.stock) {
    return {
      ok: false,
      error:
        variant.stock === 0
          ? "That size just sold out."
          : `Only ${variant.stock} left in that size.`,
    };
  }

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity },
    update: { quantity: wanted },
  });

  refresh();
  return { ok: true };
}

export async function setCartItemQuantity(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const quantity = Number(formData.get("quantity"));

  const item = await ownedLine(itemId);
  if (!item) return;

  if (!Number.isInteger(quantity) || quantity < 1) {
    await getPrisma().cartItem.delete({ where: { id: item.id } });
    refresh();
    return;
  }

  await getPrisma().cartItem.update({
    where: { id: item.id },
    data: { quantity: Math.min(quantity, item.variant.stock) },
  });

  refresh();
}

export async function removeCartItem(formData: FormData) {
  const item = await ownedLine(String(formData.get("itemId") ?? ""));
  if (!item) return;

  await getPrisma().cartItem.delete({ where: { id: item.id } });
  refresh();
}
