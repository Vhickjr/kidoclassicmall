"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { destroySession, requireAdmin } from "@/lib/auth";
import { imageList, nairaToKobo, slugify } from "@/lib/format";
import { destroyRemoved, destroyUploads } from "@/lib/cloudinary";
import { sendPaidReceiptOnce } from "@/lib/receipts";
import { sendAbandonedFollowUp } from "@/lib/abandoned";
import { removePurchasedFromBasket } from "@/lib/basket-settle";

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
  // Two things can grant admin access: a signed-in staff session, and the
  // legacy shared-secret cookie. Clearing only the cookie left a staff session
  // untouched, which is why the button looked dead.
  await destroySession();

  const jar = await cookies();
  jar.delete("kido_admin");

  refresh();
  redirect("/");
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

  const rawVideo = formData.get("videoUrl");
  const videoUrl = rawVideo === null ? undefined : String(rawVideo).trim() || null;

  // Work out what the edit removed before overwriting the row, so those files
  // can be deleted from Cloudinary rather than lingering on the free tier.
  let orphaned: string[] = [];
  if (images !== undefined || videoUrl !== undefined) {
    const before = await prisma.product.findUnique({
      where: { id },
      select: { images: true, videoUrl: true },
    });

    if (images !== undefined) {
      orphaned = imageList(before?.images).filter(
        (url) => !images.includes(url)
      );
    }

    // A swapped-out or cleared video is an orphan just like a photo.
    if (
      videoUrl !== undefined &&
      before?.videoUrl &&
      before.videoUrl !== videoUrl
    ) {
      orphaned.push(before.videoUrl);
    }
  }

  await prisma.product.update({
    where: { id },
    data: {
      name,
      brand: text(formData, "brand") || null,
      description: text(formData, "description") || null,
      categoryId: text(formData, "categoryId") || null,
      ...(images === undefined ? {} : { images }),
      ...(videoUrl === undefined ? {} : { videoUrl }),
    },
  });

  // After the save: if this fails the storefront is still correct, it just
  // leaves a file behind.
  await destroyUploads(orphaned);

  refresh();
}

export async function updateVariant(formData: FormData) {
  const prisma = await guard();
  const id = text(formData, "variantId");

  const size = text(formData, "size");
  const stock = Number(formData.get("stock"));
  const priceKobo = nairaToKobo(text(formData, "price"));
  const compareRaw = text(formData, "compareAt");
  const compareAtKobo = compareRaw ? nairaToKobo(compareRaw) : null;
  const customRaw = text(formData, "customOptionsJson");
  let customOptions = undefined;
  if (customRaw) {
    try {
      customOptions = JSON.parse(customRaw);
    } catch {}
  }

  if (!size || !Number.isInteger(stock) || stock < 0 || priceKobo === null) return;

  try {
    await prisma.productVariant.update({
      where: { id },
      data: {
        size,
        color: text(formData, "color") || null,
        ...(customOptions !== undefined ? { customOptions } : {}),
        stock,
        priceKobo,
        compareAtKobo,
      },
    });
  } catch (error) {
    console.error("updateVariant failed", error);
    return;
  }

  refresh();
}

export async function addVariant(formData: FormData) {
  const prisma = await guard();

  const productId = text(formData, "productId");
  const size = text(formData, "size");
  const stock = Number(formData.get("stock"));
  const priceKobo = nairaToKobo(text(formData, "price"));
  const compareRaw = text(formData, "compareAt");
  const compareAtKobo = compareRaw ? nairaToKobo(compareRaw) : null;
  const customRaw = text(formData, "customOptionsJson");
  let customOptions = null;
  if (customRaw) {
    try {
      customOptions = JSON.parse(customRaw);
    } catch {}
  }

  if (!productId || !size || !Number.isInteger(stock) || stock < 0 || priceKobo === null) {
    return;
  }

  try {
    await prisma.productVariant.create({
      data: {
        productId,
        size,
        color: text(formData, "color") || null,
        customOptions,
        stock,
        priceKobo,
        compareAtKobo,
      },
    });
  } catch (error) {
    console.error("addVariant failed", error);
    return;
  }

  refresh();
}

export async function deleteVariant(formData: FormData) {
  const prisma = await guard();
  const id = text(formData, "variantId");

  try {
    // A variant that has ever been ordered is protected at the database level
    // (OrderItem has onDelete: Restrict) precisely so this cannot happen — the
    // receipt has to keep saying what she actually bought.
    await prisma.productVariant.delete({ where: { id } });
  } catch (error) {
    console.error("deleteVariant refused — this size/colour has order history", error);
    return;
  }

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

  if (category?.imageUrl) await destroyUploads([category.imageUrl]);
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

    // Settling an order by hand has to stamp paidAt too, or the order counts as
    // revenue but has no date to report under, and the dashboard cannot see it.
    const becomingPaid = status === "PAID" || status === "FULFILLED";

    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(becomingPaid && !order.paidAt ? { paidAt: new Date() } : {}),
        // Reopening an order clears the payment date so revenue reporting and
        // the order's own state cannot disagree.
        ...(status === "PENDING" ? { paidAt: null } : {}),
      },
    });
  });

  // Cash on delivery is always settled by hand, so this is the only receipt
  // those customers ever get. Sent after the transaction commits, and only
  // once per order.
  if (status === "PAID" || status === "FULFILLED") {
    // Settling by hand (an offline transfer, say) is still settling: the paid
    // items have to leave the basket, exactly as they would through ALAT Pay.
    // A cash-on-delivery basket was already emptied when the order was placed,
    // so there is nothing left to match there.
    const settled = await prisma.order.findUnique({
      where: { id: orderId },
      select: { sessionId: true, items: { select: { variantId: true, quantity: true } } },
    });

    if (settled) await removePurchasedFromBasket(prisma, settled);

    after(() => sendPaidReceiptOnce(orderId));
  }

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
    // A rate typed by hand is a deliberate override, so following the feed is
    // off unless the form asks for it.
    autoRate: formData.get("autoRate") !== null,
  };

  await prisma.currency.upsert({
    where: { code },
    create: { code, ...data, active: true },
    update: data,
  });

  if (data.autoRate) {
    const { refreshRates } = await import("@/lib/rates");
    await refreshRates();
  }

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

export async function saveStoreSettings(formData: FormData) {
  const prisma = await guard();

  const flat = nairaToKobo(text(formData, "deliveryFlat"));
  const threshold = nairaToKobo(text(formData, "freeDeliveryOver"));

  if (flat === null || threshold === null) return;

  // Blank text fields are stored as null so the shipped defaults show through
  // again, rather than rendering an empty hero.
  const heroLeftImage = text(formData, "heroLeftImage") || null;
  const heroRightImage = text(formData, "heroRightImage") || null;

  // A WhatsApp number is only useful as digits: wa.me rejects spaces, dashes
  // and a leading "+", which is exactly how a phone number is usually typed.
  const whatsappNumber =
    text(formData, "whatsappNumber").replace(/[^0-9]/g, "") || null;

  const afterHours = Number(formData.get("abandonedAfterHours"));

  const values = {
    deliveryFlatKobo: flat,
    freeDeliveryOverKobo: threshold,

    heroEyebrow: text(formData, "heroEyebrow") || null,
    heroTitle: text(formData, "heroTitle") || null,
    heroSubtitle: text(formData, "heroSubtitle") || null,
    heroCtaLabel: text(formData, "heroCtaLabel") || null,
    heroCtaHref: text(formData, "heroCtaHref") || null,
    heroLeftImage,
    heroRightImage,

    whatsappEnabled: formData.get("whatsappEnabled") !== null,
    whatsappNumber,
    whatsappMessage: text(formData, "whatsappMessage") || null,

    abandonedEmailEnabled: formData.get("abandonedEmailEnabled") !== null,
    abandonedAfterHours:
      Number.isInteger(afterHours) && afterHours >= 1 ? afterHours : 24,
  };

  const existing = await prisma.storeSettings.findUnique({
    where: { id: "singleton" },
  });

  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...values },
    update: values,
  });

  // Replacing a hero image should take the old file with it. After the write,
  // so a failed save cannot delete a picture the store is still showing.
  if (existing) {
    await destroyRemoved(
      [existing.heroLeftImage, existing.heroRightImage],
      [heroLeftImage, heroRightImage]
    );
  }

  refresh();
}

export async function refreshExchangeRates() {
  await guard();

  const { refreshRates } = await import("@/lib/rates");
  await refreshRates();

  refresh();
}

export async function toggleCurrencyAutoRate(formData: FormData) {
  const prisma = await guard();
  const id = text(formData, "currencyId");

  const row = await prisma.currency.findUnique({ where: { id } });
  if (!row) return;

  const nextAutoRate = !row.autoRate;

  await prisma.currency.update({
    where: { id },
    data: { autoRate: nextAutoRate },
  });

  if (nextAutoRate) {
    const { refreshRates } = await import("@/lib/rates");
    await refreshRates();
  }

  refresh();
}

export async function broadcastToSubscribers(formData: FormData) {
  const prisma = await guard();

  const subject = text(formData, "subject");
  const body = text(formData, "body");
  if (!subject || !body) return;

  const subscribers = await prisma.subscriber.findMany({
    where: { unsubscribedAt: null },
    select: { email: true },
  });

  if (subscribers.length === 0) return;

  const { sendBroadcast } = await import("@/lib/mail");
  await sendBroadcast(subscribers.map((s) => s.email), subject, body);

  refresh();
}

export async function removeSubscriber(formData: FormData) {
  const prisma = await guard();

  // Marked rather than deleted, so a later signup cannot silently re-add
  // someone who asked to be taken off.
  await prisma.subscriber.update({
    where: { id: text(formData, "subscriberId") },
    data: { unsubscribedAt: new Date() },
  });

  refresh();
}

/* ---------------------------------- blog ---------------------------------- */

export async function saveBlogPost(formData: FormData) {
  const prisma = await guard();

  const id = text(formData, "postId");
  const title = text(formData, "title");
  const body = text(formData, "body");
  if (!title || !body) return;

  const publish = text(formData, "status") === "PUBLISHED";

  const data = {
    title,
    body,
    excerpt: text(formData, "excerpt") || null,
    coverImage: text(formData, "coverImage") || null,
    status: publish ? ("PUBLISHED" as const) : ("DRAFT" as const),
  };

  if (id) {
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) return;

    await prisma.blogPost.update({
      where: { id },
      data: {
        ...data,
        // Stamped once, on first publish, so edits do not reorder the feed.
        publishedAt:
          publish && !existing.publishedAt ? new Date() : existing.publishedAt,
      },
    });

    // Only once the row is safely saved: if this order were reversed, a failed
    // update would leave the post pointing at a file that no longer exists.
    await destroyRemoved([existing.coverImage], [data.coverImage]);
  } else {
    await prisma.blogPost.create({
      data: {
        ...data,
        slug: await uniqueSlug(slugify(title)),
        publishedAt: publish ? new Date() : null,
      },
    });
  }

  refresh();
}

/** Appends a short suffix rather than refusing a duplicate title. */
async function uniqueSlug(base: string): Promise<string> {
  const prisma = getPrisma();
  let slug = base;

  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.blogPost.findUnique({ where: { slug } });
    if (!clash) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return slug;
}

export async function deleteBlogPost(formData: FormData) {
  const prisma = await guard();
  const id = text(formData, "postId");

  const post = await prisma.blogPost.findUnique({ where: { id } });
  await prisma.blogPost.delete({ where: { id } });

  if (post?.coverImage) await destroyUploads([post.coverImage]);
  refresh();
}

/* --------------------------------- pages ---------------------------------- */

export async function saveSitePage(formData: FormData) {
  const prisma = await guard();

  const slug = text(formData, "slug");
  const title = text(formData, "title");
  const body = text(formData, "body");
  if (!slug || !title) return;

  await prisma.sitePage.upsert({
    where: { slug },
    create: { slug, title, body, published: true },
    update: { title, body, published: formData.get("published") !== null },
  });

  refresh();
}

/* --------------------------------- deals ---------------------------------- */

export async function saveDeal(formData: FormData) {
  const prisma = await guard();

  const title = text(formData, "title");
  const endsAtRaw = text(formData, "endsAt");
  if (!title || !endsAtRaw) return;

  // datetime-local gives a wall-clock string with no zone; treated as the
  // server's local time, which is what the shop owner means by "ends at 6pm".
  const endsAt = new Date(endsAtRaw);
  if (Number.isNaN(endsAt.getTime())) return;

  const data = {
    title,
    body: text(formData, "body") || null,
    imageUrl: text(formData, "imageUrl") || null,
    endsAt,
    ctaLabel: text(formData, "ctaLabel") || "View all products",
    ctaHref: text(formData, "ctaHref") || "/shop",
    active: formData.get("active") !== null,
  };

  const id = text(formData, "dealId");

  if (id) {
    const existing = await prisma.deal.findUnique({ where: { id } });
    await prisma.deal.update({ where: { id }, data });
    if (existing) await destroyRemoved([existing.imageUrl], [data.imageUrl]);
  } else {
    await prisma.deal.create({ data });
  }

  refresh();
}

export async function deleteDeal(formData: FormData) {
  const prisma = await guard();
  const id = text(formData, "dealId");

  const deal = await prisma.deal.findUnique({ where: { id } });
  await prisma.deal.delete({ where: { id } });

  if (deal?.imageUrl) await destroyUploads([deal.imageUrl]);
  refresh();
}

/* ------------------------ value props & footer links ---------------------- */

export async function saveValueProps(formData: FormData) {
  const prisma = await guard();

  const titles = formData.getAll("title").map(String);
  const bodies = formData.getAll("body").map(String);
  const icons = formData.getAll("icon").map(String);

  const rows = titles
    .map((title, index) => ({
      title: title.trim(),
      body: (bodies[index] ?? "").trim(),
      icon: (icons[index] ?? "truck").trim(),
      position: index,
    }))
    // A row with no title is treated as deleted rather than saved blank.
    .filter((row) => row.title.length > 0);

  // Replaced wholesale so reordering and removal both work from one form.
  await prisma.$transaction([
    prisma.valueProp.deleteMany({}),
    prisma.valueProp.createMany({ data: rows }),
  ]);

  refresh();
}

export async function saveFooterLinks(formData: FormData) {
  const prisma = await guard();

  const rows: { column: string; label: string; href: string; position: number }[] =
    [];

  for (const column of ["information", "service"]) {
    const labels = formData.getAll(`${column}-label`).map(String);
    const hrefs = formData.getAll(`${column}-href`).map(String);

    labels.forEach((label, index) => {
      const href = (hrefs[index] ?? "").trim();
      if (!label.trim() || !href) return;
      rows.push({ column, label: label.trim(), href, position: index });
    });
  }

  await prisma.$transaction([
    prisma.footerLink.deleteMany({}),
    prisma.footerLink.createMany({ data: rows }),
  ]);

  refresh();
}

/** Send an abandoned-checkout follow-up by hand, from the admin list. */
export async function sendAbandonedFollowUpAction(formData: FormData) {
  await guard();

  const kind = text(formData, "kind") === "cart" ? "cart" : "order";
  const id = text(formData, "id");
  if (!id) return;

  // Forced: staff pressed the button deliberately, so a follow-up that already
  // went automatically should not silently do nothing.
  const result = await sendAbandonedFollowUp(kind, id, { force: true });
  if (!result.ok) {
    console.error("manual follow-up not sent", kind, id, result.reason);
  }

  refresh();
}
