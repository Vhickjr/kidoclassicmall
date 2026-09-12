import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AuthButton from "@/app/_components/auth-button";
import NotWired from "@/app/_components/not-wired";

const BOXES = [0, 1, 2, 3, 4];

export default function OtpPanel() {
  return (
    <div>
      <Link
        href="/forgot-password"
        className="inline-flex items-center gap-1.5 text-sm hover:text-muted"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Back
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">Enter OTP</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        We have sent a code to your registered email address you@example.com
      </p>

      <div className="mt-6 flex gap-3">
        {BOXES.map((index) => (
          <input
            key={index}
            // Focus does not jump between boxes yet; that arrives with the real
            // verification step.
            inputMode="numeric"
            maxLength={1}
            aria-label={`Digit ${index + 1}`}
            className="size-14 rounded-lg border border-line text-center text-lg outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/20"
          />
        ))}
      </div>

      <AuthButton label="Verify" href="/password-changed" />

      <NotWired>
        Shell only. Any code walks through to the next screen.
      </NotWired>
    </div>
  );
}
