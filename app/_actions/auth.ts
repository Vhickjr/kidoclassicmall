"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export type AuthResult = { error: string } | undefined;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function signUp(
  _previous: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters." };
  }
  if (formData.get("terms") === null) {
    return { error: "Please accept the terms and conditions." };
  }

  const prisma = getPrisma();

  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "An account already uses that email address." };
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      firstName: text(formData, "firstName") || null,
      lastName: text(formData, "lastName") || null,
    },
  });

  await createSession(user.id);
  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signIn(
  _previous: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await getPrisma().user.findUnique({ where: { email } });

  // One message for both branches, so this cannot be used to discover which
  // email addresses have accounts.
  const wrong = { error: "That email and password do not match." };

  if (!user) return wrong;
  if (!(await verifyPassword(password, user.passwordHash))) return wrong;
  if (!user.isActive) return { error: "That account has been disabled." };

  await createSession(user.id);
  revalidatePath("/", "layout");

  redirect(user.role === "CUSTOMER" ? "/account" : "/admin");
}

export async function signOut() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}
