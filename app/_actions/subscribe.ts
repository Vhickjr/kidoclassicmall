"use server";

import { getPrisma } from "@/lib/prisma";

export type SubscribeResult = { ok: boolean; message: string };

export async function subscribe(
  _previous: SubscribeResult | undefined,
  formData: FormData
): Promise<SubscribeResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const prisma = getPrisma();
  const existing = await prisma.subscriber.findUnique({ where: { email } });

  if (existing && existing.unsubscribedAt === null) {
    // Same reply either way, so the form cannot be used to discover who is
    // already on the list.
    return { ok: true, message: "Thanks — you are on the list." };
  }

  await prisma.subscriber.upsert({
    where: { email },
    create: { email, source: String(formData.get("source") ?? "footer") },
    // Re-subscribing clears a previous opt-out.
    update: { unsubscribedAt: null },
  });

  return { ok: true, message: "Thanks — you are on the list." };
}
