import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthSplit from "@/app/_components/auth-split";
import AuthField from "@/app/_components/auth-field";
import AuthForm from "@/app/_components/auth-form";
import { signIn } from "@/app/_actions/auth";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/account");

  return (
    <AuthSplit showLogo>
      <h1 className="text-3xl font-bold tracking-tight">Welcome 👋</h1>
      <p className="mt-2 text-sm text-muted">Please login here</p>

      <AuthForm action={signIn} label="Login">
        <AuthField
          label="Email Address"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <AuthField
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••••••"
          autoComplete="current-password"
          required
        />

        <div className="mt-5 flex items-center justify-between">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="remember"
              defaultChecked
              className="size-4 accent-brand"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm hover:text-muted">
            Forgot password?
          </Link>
        </div>
      </AuthForm>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="text-foreground underline">
          Create an account
        </Link>
      </p>
    </AuthSplit>
  );
}
