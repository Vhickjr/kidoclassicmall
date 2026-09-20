import Link from "next/link";
import {
  Camera,
  Coins,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  Newspaper,
  Package,
  Percent,
  ReceiptText,
  Settings as SettingsIcon,
  Star,
  Store,
  Tag,
  Tags,
  Users,
  ShoppingBag,
} from "lucide-react";
import Logo from "@/app/_components/logo";
import MobileNav from "@/app/_components/mobile-nav";
import { requireAdmin } from "@/lib/auth";
import PasswordInput from "@/app/_components/password-input";
import { signInAdmin, signOutAdmin } from "@/app/_actions/admin";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/discounts", label: "Discounts", icon: Percent },
  { href: "/admin/stories", label: "Instagram Stories", icon: Camera },
  { href: "/admin/currencies", label: "Currencies", icon: Coins },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/blog", label: "Blog", icon: Newspaper },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/deals", label: "Deals", icon: Tag },
  { href: "/admin/abandoned", label: "Abandoned carts", icon: ShoppingBag },
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail },
  { href: "/admin/staff", label: "Staff & roles", icon: Users },
  { href: "/admin/settings", label: "Store settings", icon: SettingsIcon },
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
            <span className="mt-1.5 block">
              <PasswordInput
                name="secret"
                className="w-full rounded-lg border border-foreground px-4 py-3 text-sm outline-none"
              />
            </span>
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
        <div className="flex items-center justify-between p-5">
          <Logo size={36} href="/admin" label="Kidoclassic admin" />
          <MobileNav
            label="Admin"
            links={[
              ...NAV.map((item) => ({ href: item.href, label: item.label })),
              { href: "/", label: "View storefront" },
            ]}
          >
            {/* Sign out belongs in the menu too — on a phone the sidebar that
                normally carries it is hidden. */}
            <form action={signOutAdmin}>
              <button
                type="submit"
                className="flex items-center gap-3 text-sm text-muted hover:text-foreground"
              >
                <LogOut aria-hidden className="size-4" />
                Sign out
              </button>
            </form>
          </MobileNav>
        </div>

        <nav className="hidden md:block">
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

        <div className="mt-6 hidden border-t border-line p-5 md:block">
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
