"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CURRENCY_COOKIE } from "@/lib/currency";

export async function setCurrency(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return;

  const jar = await cookies();
  jar.set(CURRENCY_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
}
