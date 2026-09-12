import type { Metadata } from "next";
import Link from "next/link";
import AuthSplit from "@/app/_components/auth-split";
import AuthField from "@/app/_components/auth-field";
import AuthButton from "@/app/_components/auth-button";
import NotWired from "@/app/_components/not-wired";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <AuthSplit photoSeed="auth-login" showLogo>
      <h1 className="text-3xl font-bold tracking-tight">Welcome 👋</h1>
      <p className="mt-2 text-sm text-muted">Please login here</p>

      <AuthField
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
      />
      <AuthField
        label="Password"
        type="password"
        placeholder="••••••••••••"
        autoComplete="current-password"
      />

      <div className="mt-5 flex items-center justify-between">
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            defaultChecked
            className="size-4 accent-foreground"
          />
          Remember me
        </label>
        <Link href="/forgot-password" className="text-sm hover:text-muted">
          Forgot password?
        </Link>
      </div>

      <AuthButton label="Login" />

      <NotWired>Shell only. Signing in does nothing yet.</NotWired>

      {/* Not in the mockup, but a login screen with no route to registration
          strands new customers. Remove if you would rather match it exactly. */}
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="text-foreground underline">
          Create an account
        </Link>
      </p>
    </AuthSplit>
  );
}
