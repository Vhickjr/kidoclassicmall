import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
  Package,
  Percent,
  ReceiptText,
  Coins,
  Star,
  Store,
  Tags,
  Users,
} from "lucide-react";
import Logo from "@/app/_components/logo";
import { requireAdmin } from "@/lib/auth";
import { signInAdmin, signOutAdmin } from "@/app/_actions/admin";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/discounts", label: "Discounts", icon: Percent },
  { href: "/admin/currencies", label: "Currencies", icon: Coins },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/staff", label: "Staff & roles", icon: Users },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const allowed = await requireAdmin();

  if (!allowed) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="mt-3 text-sm text-muted">
          This area is behind a shared secret. Enter the value of{" "}
          <code>ADMIN_SECRET</code> to continue.
        </p>

        <form action={signInAdmin} className="mt-6">
          <label className="block">
            <span className="text-xs text-muted">Admin secret</span>
            <input
              name="secret"
              type="password"
              autoComplete="off"
              className="mt-1.5 w-full rounded-lg border border-foreground px-4 py-3 text-sm outline-none"
            />
          </label>
          <button
            type="submit"
            className="mt-5 w-full rounded-lg bg-brand py-3.5 text-sm text-white"
          >
            Enter
          </button>
        </form>

        <p className="mt-6 rounded border border-dashed border-line px-3 py-2 text-xs text-muted">
          With no <code>ADMIN_SECRET</code> set, development lets you straight
          through. In production an unset secret locks the admin instead of
          opening it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-line bg-surface lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="p-5">
          <Logo size={36} href="/admin" label="Kidoclassic admin" />
        </div>

        <nav>
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-brand-soft/40"
                >
                  <item.icon aria-hidden className="size-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 border-t border-line p-5">
          <Link
            href="/"
            className="flex items-center gap-3 text-sm text-muted hover:text-foreground"
          >
            <Store aria-hidden className="size-4" />
            View storefront
          </Link>

          <form action={signOutAdmin} className="mt-4">
            <button
              type="submit"
              className="flex items-center gap-3 text-sm text-muted hover:text-foreground"
            >
              <LogOut aria-hidden className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6 lg:p-10">{children}</main>
    </div>
  );
}
