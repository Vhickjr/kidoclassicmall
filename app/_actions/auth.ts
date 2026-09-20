"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import { getPrisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  createPasswordResetToken,
  verifyPasswordResetCode,
  generateEmailVerificationToken,
  verifyEmailToken,
  getSessionUser,
} from "@/lib/auth";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/mail";

export type AuthResult = { error: string } | undefined;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
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

  // Sent after the response, and never allowed to fail the signup: the account
  // exists either way, and a customer who cannot be emailed can still ask for
  // the verification link again from their account page.
  const token = await generateEmailVerificationToken(user.id);
  const baseUrl = await getBaseUrl();
  after(async () => {
    try {
      await sendVerificationEmail(email, `${baseUrl}/verify-email?token=${token}`);
    } catch (error) {
      console.error("verification email failed to send", email, error);
    }
  });

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

export async function requestPasswordReset(
  _previous: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = text(formData, "email").toLowerCase();
  if (!email.includes("@")) return { error: "Enter a valid email address." };

  // Always show the same message to prevent email enumeration
  const user = await getPrisma().user.findUnique({ where: { email } });
  if (user) {
    const code = await createPasswordResetToken(user.id);
    // Off the response path, so a slow mail server cannot leave someone
    // staring at a spinner on the forgot-password form.
    after(async () => {
      try {
        await sendPasswordResetEmail(email, code);
      } catch (error) {
        console.error("password reset email failed to send", email, error);
      }
    });
  }

  redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
}

export async function verifyResetOtp(
  _previous: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email = text(formData, "email");
  const code = text(formData, "code");

  if (!email || code.length !== 5) {
    return { error: "Enter the 5-digit code from your email." };
  }

  const result = await verifyPasswordResetCode(email, code);
  if (!result) {
    return { error: "Invalid or expired code. Please try again." };
  }

  redirect(
    `/reset-password?token=${result.token}&email=${encodeURIComponent(email)}`
  );
}

export async function setNewPassword(
  _previous: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const email = text(formData, "email");
  const token = text(formData, "token");

  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const user = await getPrisma().user.findUnique({ where: { email } });
  if (!user) return { error: "Something went wrong. Please start over." };

  // Verify the token belongs to this user (the token was already marked used
  // in verifyResetOtp, so we just check the user+token pairing exists)
  const resetRecord = await getPrisma().passwordResetToken.findFirst({
    where: { token, userId: user.id },
  });
  if (!resetRecord) return { error: "Invalid reset link. Please start over." };

  await getPrisma().user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password) },
  });

  // Destroy all existing sessions for security
  await getPrisma().session.deleteMany({ where: { userId: user.id } });

  redirect("/password-changed");
}

export async function resendVerificationEmail(): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) return { error: "You must be logged in." };
  if (user.emailVerified) return { error: "Your email is already verified." };

  const token = await generateEmailVerificationToken(user.id);
  const baseUrl = await getBaseUrl();
  await sendVerificationEmail(
    user.email,
    `${baseUrl}/verify-email?token=${token}`
  );

  return undefined; // success, no error
}

export async function updateProfile(
  _previous: { success?: boolean; error?: string } | undefined,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "You must be signed in to update your profile." };

  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const phone = text(formData, "phone");

  await getPrisma().user.update({
    where: { id: user.id },
    data: {
      firstName: firstName || null,
      lastName: lastName || null,
      phone: phone || null,
    },
  });

  revalidatePath("/account");
  return { success: true };
}
