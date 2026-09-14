"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { CART_COOKIE, readSessionId } from "@/lib/cart";
import { SETTINGS_COOKIE, type Settings, readSettings } from "@/lib/settings";

const ONE_YEAR = 60 * 60 * 24 * 365;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  };
}

async function sessionForWriting() {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing) return existing;

  const sessionId = randomUUID();
  jar.set(CART_COOKIE, sessionId, cookieOptions());
  return sessionId;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function toggleWishlist(productId: string) {
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product || product.status !== "PUBLISHED") {
    return { ok: false as const, error: "That item is not available." };
  }

  const sessionId = await sessionForWriting();
  const existing = await prisma.wishlistItem.findUnique({
    where: { sessionId_productId: { sessionId, productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/", "layout");
    return { ok: true as const, saved: false };
  }

  await prisma.wishlistItem.create({ data: { sessionId, productId } });
  revalidatePath("/", "layout");
  return { ok: true as const, saved: true };
}

export async function removeWishlistItem(formData: FormData) {
  const sessionId = await readSessionId();
  if (!sessionId) return;

  const id = text(formData, "itemId");
  const item = await getPrisma().wishlistItem.findUnique({ where: { id } });

  // Direct POSTs are possible, so the row must belong to this cookie.
  if (!item || item.sessionId !== sessionId) return;

  await getPrisma().wishlistItem.delete({ where: { id } });
  revalidatePath("/", "layout");
}

export async function updateAddress(formData: FormData) {
  const sessionId = await readSessionId();
  if (!sessionId) return;

  const id = text(formData, "addressId");
  const prisma = getPrisma();
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.sessionId !== sessionId) return;

  const makeDefault = formData.get("isDefault") !== null;
  if (makeDefault) {
    await prisma.address.updateMany({
      where: { sessionId },
      data: { isDefault: false },
    });
  }

  await prisma.address.update({
    where: { id },
    data: {
      fullName: text(formData, "fullName") || existing.fullName,
      phone: text(formData, "phone") || existing.phone,
      line1: text(formData, "line1") || existing.line1,
      line2: text(formData, "line2") || null,
      city: text(formData, "city") || existing.city,
      state: text(formData, "state") || existing.state,
      postalCode: text(formData, "postalCode") || null,
      isDefault: makeDefault,
    },
  });

  revalidatePath("/", "layout");
}

export async function markNotificationsRead() {
  const sessionId = await readSessionId();
  if (!sessionId) return;

  await getPrisma().notification.updateMany({
    where: { sessionId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
}

export async function saveSettings(formData: FormData) {
  const current = await readSettings();

  const next: Settings = {
    appearance: formData.get("appearance") === "dark" ? "dark" : "light",
    language: text(formData, "language") || current.language,
    twoFactor: formData.get("twoFactor") !== null,
    pushNotifications: formData.get("pushNotifications") !== null,
    desktopNotifications: formData.get("desktopNotifications") !== null,
    emailNotifications: formData.get("emailNotifications") !== null,
  };

  const jar = await cookies();
  jar.set(SETTINGS_COOKIE, JSON.stringify(next), cookieOptions());

  revalidatePath("/", "layout");
}
