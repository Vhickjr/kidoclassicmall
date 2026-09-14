"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { getSessionUser, isStaff } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Customers may only review something they actually bought. That is checked
 * against their own orders here rather than trusting the form, which is also
 * what stops a stranger reviewing the whole catalogue.
 */
export async function submitReview(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;

  const productId = text(formData, "productId");
  const rating = Number(formData.get("rating"));
  const body = text(formData, "body");

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;
  if (body.length < 10) return;

  const prisma = getPrisma();

  const bought = await prisma.orderItem.findFirst({
    where: {
      order: { userId: user.id },
      variant: { productId },
    },
  });

  if (!bought) return;

  await prisma.review.upsert({
    where: { productId_userId: { productId, userId: user.id } },
    create: {
      productId,
      userId: user.id,
      rating,
      title: text(formData, "title") || null,
      body,
      status: "PENDING",
    },
    // Editing a published review sends it back for approval.
    update: {
      rating,
      title: text(formData, "title") || null,
      body,
      status: "PENDING",
      moderatedAt: null,
    },
  });

  revalidatePath("/", "layout");
}

export async function moderateReview(formData: FormData) {
  if (!isStaff(await getSessionUser())) {
    // Fall back to the shared-secret gate so the admin still works before any
    // staff accounts exist.
    const { requireAdmin } = await import("@/lib/auth");
    if (!(await requireAdmin())) throw new Error("Not authorised.");
  }

  const decision = text(formData, "decision");
  if (decision !== "APPROVED" && decision !== "REJECTED") return;

  await getPrisma().review.update({
    where: { id: text(formData, "reviewId") },
    data: { status: decision, moderatedAt: new Date() },
  });

  revalidatePath("/", "layout");
}
