import type { Metadata } from "next";
import AuthSplit from "@/app/_components/auth-split";
import OtpPanel from "@/app/_components/otp-panel";

export const metadata: Metadata = {
  title: "Enter OTP",
};

export default function VerifyOtpPage() {
  return (
    <AuthSplit photoSeed="auth-otp">
      <OtpPanel />
    </AuthSplit>
  );
}
