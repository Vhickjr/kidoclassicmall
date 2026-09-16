import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";

const derive = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number
) => Promise<Buffer>;

export const SESSION_COOKIE = "kido_session";
const SESSION_DAYS = 30;

/**
 * scrypt from node's own crypto rather than bcrypt or argon2. Both of those are
 * native modules that need compiling, which is exactly the kind of thing that
 * fails on shared hosting; this has no build step at all.
 *
 * The password is passed as a value the whole way through, so the apostrophe and
 * backslash bug that broke sign-ins on the WordPress site cannot happen here.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const key = await derive(password, salt, 64);
  const expected = Buffer.from(hash, "hex");

  // Compare in constant time so a wrong password cannot be narrowed by timing.
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await getPrisma().session.create({ data: { token, userId, expiresAt } });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    await getPrisma().session.deleteMany({ where: { token } });
  }

  jar.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";
  emailVerified: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await getPrisma().session.findUnique({
    where: { token },
    include: { user: true },
  });

  // An expired or revoked session, or a staff account that was switched off.
  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

export function isStaff(user: SessionUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
}

export function isSuperAdmin(user: SessionUser | null): boolean {
  return user?.role === "SUPER_ADMIN";
}

/**
 * Admin gate. A signed-in staff account is the real route in.
 *
 * ADMIN_SECRET stays as a bootstrap so the very first super admin can be created
 * on a fresh database, and so it keeps working in development where no secret is
 * set. It still fails closed in production when unset.
 */
export async function requireAdmin(): Promise<boolean> {
  if (isStaff(await getSessionUser())) return true;

  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
    return true;
  }

  const jar = await cookies();
  return jar.get("kido_admin")?.value === secret;
}

export async function requireSuperAdmin(): Promise<boolean> {
  if (isSuperAdmin(await getSessionUser())) return true;

  // Same bootstrap path: without it there would be no way to create the first
  // super admin on a fresh install.
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const jar = await cookies();
  return jar.get("kido_admin")?.value === secret;
}

/* ------------------------------------------------------------------ */
/*  Password-reset & email-verification helpers                       */
/* ------------------------------------------------------------------ */

function getVerificationSecret(): string {
  return process.env.ADMIN_SECRET || "dev-verification-key";
}

/**
 * Generate a 5-digit numeric reset code and persist a PasswordResetToken row.
 * Any previous unused tokens for the same user are invalidated first.
 */
export async function createPasswordResetToken(
  userId: string
): Promise<string> {
  const prisma = getPrisma();

  // Invalidate any outstanding (unused) tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId, usedAt: null },
  });

  const token = randomBytes(32).toString("hex");
  const code = String(Math.floor(Math.random() * 100_000)).padStart(5, "0");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.passwordResetToken.create({
    data: { token, code, userId, expiresAt },
  });

  return code;
}

/**
 * Verify a password-reset code submitted by the user.
 * Returns the userId + backing token on success, or null.
 */
export async function verifyPasswordResetCode(
  email: string,
  code: string
): Promise<{ userId: string; token: string } | null> {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      code,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });
  if (!resetToken) return null;

  // Mark as used
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  return { userId: user.id, token: resetToken.token };
}

/**
 * Generate an email-verification token (HMAC-based) and persist it
 * as a PasswordResetToken row with code='EMAIL_VERIFY' and 24-hour expiry.
 */
export async function generateEmailVerificationToken(
  userId: string
): Promise<string> {
  const prisma = getPrisma();

  const token = createHmac("sha256", getVerificationSecret())
    .update(userId + ":" + Date.now())
    .digest("hex");

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.passwordResetToken.create({
    data: { token, code: "EMAIL_VERIFY", userId, expiresAt },
  });

  return token;
}

/**
 * Verify an email-verification token.
 * On success marks the token as used and sets user.emailVerified = true.
 */
export async function verifyEmailToken(token: string): Promise<boolean> {
  const prisma = getPrisma();

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      token,
      code: "EMAIL_VERIFY",
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });
  if (!record) return false;

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    }),
  ]);

  return true;
}
