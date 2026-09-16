import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthSplit from "@/app/_components/auth-split";
import OtpPanel from "@/app/_components/otp-panel";

export const metadata: Metadata = {
  title: "Enter OTP",
};

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  if (!email) redirect("/forgot-password");

  return (
    <AuthSplit photoSeed="auth-otp">
      <OtpPanel email={email} />
    </AuthSplit>
  );
}
