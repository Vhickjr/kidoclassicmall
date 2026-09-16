"use client";

import { useRef, useActionState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { verifyResetOtp, type AuthResult } from "@/app/_actions/auth";

export default function OtpPanel({ email }: { email: string }) {
  const [result, submit, pending] = useActionState(verifyResetOtp, undefined);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const codeRef = useRef<HTMLInputElement>(null);

  function handleInput(index: number, value: string) {
    // Update the hidden field with all digits combined
    if (codeRef.current) {
      const digits = inputs.current.map((el) => el?.value ?? "").join("");
      codeRef.current.value = digits;
    }
    // Auto-advance to next input
    if (value && index < 4) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !inputs.current[index]?.value && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 5);
    text.split("").forEach((char, i) => {
      if (inputs.current[i]) {
        inputs.current[i]!.value = char;
      }
    });
    if (codeRef.current) {
      codeRef.current.value = text;
    }
    inputs.current[Math.min(text.length, 4)]?.focus();
  }

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
        We have sent a code to your registered email address{" "}
        <strong className="text-foreground">{email}</strong>
      </p>

      <form action={submit}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="code" ref={codeRef} />

        <div className="mt-6 flex gap-3" onPaste={handlePaste}>
          {[0, 1, 2, 3, 4].map((index) => (
            <input
              key={index}
              ref={(el) => { inputs.current[index] = el; }}
              inputMode="numeric"
              maxLength={1}
              aria-label={`Digit ${index + 1}`}
              className="size-14 rounded-lg border border-line text-center text-lg outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
              onChange={(e) => handleInput(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
            />
          ))}
        </div>

        {result?.error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {result.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-7 w-full rounded-lg bg-brand py-3.5 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Verifying…" : "Verify"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Didn&apos;t receive a code?{" "}
        <Link
          href={`/forgot-password`}
          className="text-foreground underline"
        >
          Resend
        </Link>
      </p>
    </div>
  );
}
