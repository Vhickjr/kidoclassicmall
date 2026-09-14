import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { signOut } from "@/app/_actions/auth";
import {
  Bell,
  CreditCard,
  Heart,
  MapPin,
  Package,
  Settings,
  Star,
  User,
} from "lucide-react";

const NAV = [
  { href: "/account", label: "Personal Information", icon: User },
  { href: "/account/orders", label: "My Orders", icon: Package },
  { href: "/account/reviews", label: "My Reviews", icon: Star },
  { href: "/account/wishlist", label: "My Wishlists", icon: Heart },
  { href: "/account/addresses", label: "Manage Addresses", icon: MapPin },
  { href: "/account/saved-cards", label: "Saved Cards", icon: CreditCard },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

export default async function AccountLayout({
  children,
}: LayoutProps<"/account">) {
  const user = await getSessionUser();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-3xl tracking-tight text-brand-dark">My Profile</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[16rem_1fr]">
        <aside className="h-fit overflow-hidden rounded-lg border border-line bg-surface">
          <div className="border-b border-line bg-brand-soft/50 p-5">
            <p className="text-sm text-muted">Hello 👋</p>
            <p className="mt-1 font-semibold">
              {user ? (user.firstName ?? user.email) : "Guest"}
            </p>
          </div>

          <nav>
            <ul>
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-brand-soft/40"
                  >
                    <item.icon aria-hidden className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-line p-5">
            {user ? (
              <form action={signOut}>
                <button type="submit" className="text-sm text-muted hover:text-foreground">
                  Sign out
                </button>
              </form>
            ) : (
              <Link href="/login" className="text-sm underline">
                Sign in
              </Link>
            )}
          </div>
        </aside>

        <div>{children}</div>
      </div>
    </div>
  );
}
