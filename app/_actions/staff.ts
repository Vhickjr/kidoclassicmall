"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import {
  getSessionUser,
  hashPassword,
  requireSuperAdmin,
} from "@/lib/auth";

/** Only a super admin may change who the staff are, or what they can reach. */
async function guard() {
  if (!(await requireSuperAdmin())) throw new Error("Not authorised.");
  return getPrisma();
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

const ROLES = ["CUSTOMER", "ADMIN", "SUPER_ADMIN"] as const;
type RoleValue = (typeof ROLES)[number];

function isRole(value: string): value is RoleValue {
  return (ROLES as readonly string[]).includes(value);
}

export async function setUserRole(formData: FormData) {
  const prisma = await guard();

  const userId = text(formData, "userId");
  const role = text(formData, "role");
  if (!isRole(role)) return;

  const me = await getSessionUser();

  // Removing your own super admin rights can lock everyone out of staff
  // management, so it is refused.
  if (me?.id === userId && role !== "SUPER_ADMIN") return;

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/", "layout");
}

export async function setUserActive(formData: FormData) {
  const prisma = await guard();

  const userId = text(formData, "userId");
  const active = text(formData, "active") === "true";

  const me = await getSessionUser();
  if (me?.id === userId && !active) return;

  await prisma.user.update({ where: { id: userId }, data: { isActive: active } });

  // Switching an account off ends its sessions immediately rather than letting
  // the existing cookie run until it expires.
  if (!active) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  revalidatePath("/", "layout");
}

export async function createStaff(formData: FormData) {
  const prisma = await guard();

  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = text(formData, "role");

  if (!email.includes("@") || password.length < 8 || !isRole(role)) return;
  if (await prisma.user.findUnique({ where: { email } })) return;

  await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      firstName: text(formData, "firstName") || null,
      role,
    },
  });

  revalidatePath("/", "layout");
}
