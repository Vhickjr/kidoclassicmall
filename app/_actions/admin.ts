"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { imageList, nairaToKobo, slugify } from "@/lib/format";
import { destroyImages } from "@/lib/cloudinary";

/** Every action here re-checks the gate. Server actions accept direct POSTs, so
 *  rendering the admin behind a check is not by itself protection. */
async function guard() {
  if (!(await requireAdmin())) throw new Error("Not authorised.");
  return getPrisma();
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function signInAdmin(formData: FormData) {
  const secret = process.env.ADMIN_SECRET;
  const supplied = text(formData, "secret");

  if (!secret || supplied !== secret) return;

  const jar = await cookies();
  jar.set("kido_admin", supplied, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  refresh();
}

export async function signOutAdmin() {
  const jar = await cookies();
  jar.delete("kido_admin");
  refresh();
}

export async function setProductStatus(formData: FormData) {
  const prisma = await guard();
  const status = text(formData, "status");

  if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) return;

  await prisma.product.update({
    where: { id: text(formData, "productId") },
    data: { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" },
  });

  refresh();
}

export async function updateProductDetails(formData: FormData) {
  const prisma = await guard();
  const id = text(formData, "productId");

  const name = text(formData, "name");
  if (!name) return;

  // The uploader submits one URL per line; an absent field means "leave as is".
  const rawImages = formData.get("images");
  const images =
    rawImages === null
      ? undefined
      : String(rawImages)
          .split(/[\n,]/)
          .map((line) => line.trim())
          .filter(Boolean);

  // Work out what the edit removed before overwriting the row, so those files
  // can be deleted from Cloudinary rather than lingering on the free tier.
  let orphaned: string[] = [];
  if (images !== undefined) {
    const before = await prisma.product.findUnique({
      where: { id },
      select: { images: true },
    });
    orphaned = imageList(before?.images).filter((url) => !images.includes(url));
  }

  await prisma.product.update({
    where: { id },
    data: {
      name,
      brand: text(formData, "brand") || null,
      description: text(formData, "description") || null,
      categoryId: text(formData, "categoryId") || null,
      ...(images === undefined ? {} : { images }),
    },
  });

  // After the save: if this fails the storefront is still correct, it just
  // leaves a file behind.
  await destroyImages(orphaned);

  refresh();
}

export async function updateVariant(formData: FormData) {
  const prisma = await guard();
  const id = text(formData, "variantId");

  const stock = Number(formData.get("stock"));
  const priceKobo = nairaToKobo(text(formData, "price"));
  const compareRaw = text(formData, "compareAt");
  const compareAtKobo = compareRaw ? nairaToKobo(compareRaw) : null;

  if (!Number.isInteger(stock) || stock < 0 || priceKobo === null) return;

  await prisma.productVariant.update({
    where: { id },
    data: { stock, priceKobo, compareAtKobo },
  });

  refresh();
}

export async function createCategory(formData: FormData) {
  const prisma = await guard();
  const name = text(formData, "name");
  if (!name) return;

  await prisma.category.create({
    data: {
      name,
      slug: slugify(name),
      imageUrl: text(formData, "imageUrl") || null,
    },
  });

  refresh();
}

export async function deleteCategory(formData: FormData) {
  const prisma = await guard();

  const id = text(formData, "categoryId");
  const category = await prisma.category.findUnique({ where: { id } });

  // Products point at categories with onDelete: SetNull, so this un-files them
  // rather than deleting stock.
  await prisma.category.delete({ where: { id } });

  if (category?.imageUrl) await destroyImages([category.imageUrl]);
  refresh();
}

export async function createDiscount(formData: FormData) {
  const prisma = await guard();
  const code = text(formData, "code").toUpperCase();
  if (!code) return;

  const percent = Number(formData.get("percentOff"));
  const amount = nairaToKobo(text(formData, "amountOff"));

  const usablePercent =
    Number.isInteger(percent) && percent > 0 && percent <= 100 ? percent : null;

  // One or the other, never both, or the discount is ambiguous.
  if (usablePercent === null && amount === null) return;

  await prisma.discountCode.create({
    data: {
      code,
      percentOff: usablePercent,
      amountOffKobo: usablePercent === null ? amount : null,
      active: true,
    },
  });

  refresh();
}

export async function toggleDiscount(formData: FormData) {
  const prisma = await guard();
  const id = text(formData, "discountId");

  const row = await prisma.discountCode.findUnique({ where: { id } });
  if (!row) return;

  await prisma.discountCode.update({
    where: { id },
    data: { active: !row.active },
  });

  refresh();
}

export async function deleteDiscount(formData: FormData) {
  const prisma = await guard();
  await prisma.discountCode.delete({ where: { id: text(formData, "discountId") } });
  refresh();
}

type OrderStatusValue =
  | "PENDING"
  | "PAID"
  | "FULFILLED"
  | "CANCELLED"
  | "REFUNDED";

const ORDER_STATUSES: OrderStatusValue[] = [
  "PENDING",
  "PAID",
  "FULFILLED",
  "CANCELLED",
  "REFUNDED",
];

function isOrderStatus(value: string): value is OrderStatusValue {
  return (ORDER_STATUSES as string[]).includes(value);
}

export async function setOrderStatus(formData: FormData) {
  const prisma = await guard();
  const status = text(formData, "status");
  const orderId = text(formData, "orderId");

  if (!isOrderStatus(status)) return;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.status === status) return;

    // Stock was taken when the order was paid, so cancelling or refunding it
    // has to give those units back or they are lost from the count forever.
    const hadStockTaken = order.status === "PAID" || order.status === "FULFILLED";
    const releasing = status === "CANCELLED" || status === "REFUNDED";

    if (hadStockTaken && releasing) {
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    await tx.order.update({ where: { id: orderId }, data: { status } });
  });

  refresh();
}

export async function upsertCurrency(formData: FormData) {
  const prisma = await guard();

  const code = text(formData, "code").toUpperCase();
  const rate = Number(formData.get("unitsPerNaira"));

  if (!/^[A-Z]{3}$/.test(code)) return;
  if (!Number.isFinite(rate) || rate <= 0) return;

  const data = {
    symbol: text(formData, "symbol") || code,
    name: text(formData, "name") || code,
    unitsPerNaira: rate,
  };

  await prisma.currency.upsert({
    where: { code },
    create: { code, ...data, active: true },
    update: data,
  });

  refresh();
}

export async function toggleCurrency(formData: FormData) {
  const prisma = await guard();
  const id = text(formData, "currencyId");

  const row = await prisma.currency.findUnique({ where: { id } });
  if (!row) return;

  await prisma.currency.update({
    where: { id },
    data: { active: !row.active },
  });

  refresh();
}

export async function deleteCurrency(formData: FormData) {
  const prisma = await guard();
  await prisma.currency.delete({ where: { id: text(formData, "currencyId") } });
  refresh();
}
