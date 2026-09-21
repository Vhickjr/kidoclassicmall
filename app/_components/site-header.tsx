import Link from "next/link";
import { ChevronDown, Heart, Search } from "lucide-react";
import Minicart from "@/app/_components/minicart";
import Logo from "@/app/_components/logo";
import { getSessionUser, isStaff } from "@/lib/auth";
import { activeCurrency, listCurrencies } from "@/lib/currency-server";
import CurrencySwitcher from "@/app/_components/currency-switcher";
import MobileNav from "@/app/_components/mobile-nav";


import { cartCount, cartSubtotalKobo, readCart } from "@/lib/cart";
import { getPrisma } from "@/lib/prisma";

export default async function SiteHeader() {
  const [user, currencies, currency, cart, pages, categories] = await Promise.all([
    getSessionUser(),
    listCurrencies(),
    activeCurrency(),
    readCart(),
    // Our Story and Contact are written in the admin. The links are always
    // shown — the pages render a shell until there is content — and the saved
    // title is used once there is one, so renaming a page renames its link.
    getPrisma().sitePage.findMany({
      where: { published: true, slug: { in: ["our-story", "contact"] } },
      select: { slug: true, title: true },
    }),
    getPrisma().category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const published = new Map(pages.map((page) => [page.slug, page.title]));
  const storyTitle = published.get("our-story");
  const contactTitle = published.get("contact");

  return (
    <header className="relative border-b-2 border-brand/30 bg-surface">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-5">
        <Logo size={40} />

        {/* Shows from `xl` (1280px), not `lg`. Measured: this row needs about
            1144px for the logo, five links, search, currency switcher, icons
            and the login button. At an iPad Mini's 1024px landscape width that
            is 120px short, so the nav was being crammed instead of folding
            away. Every tablet now gets the hamburger; laptops keep the bar.

            `self-stretch` fills the outer row's own padded height (the row this
            dropdown positions against), not just this nav's tight content
            height — the Shop wrapper below stretches again against *this*
            box, so the chain reaches all the way down to where the dropdown
            actually starts, with no gap for hover to drop out over. */}
        <nav className="hidden items-center gap-8 self-stretch text-sm xl:flex">
          <Link href="/" className="hover:text-muted">
            Home
          </Link>

          {/* Opens on hover, and on keyboard focus so it is reachable by tab.
              Two things had to be fixed for hover to hold reliably:
              (1) The dropdown positions against the header's max-w-6xl row
                  (marked `relative` above). This wrapper used to be `static`,
                  which made the browser skip past it to the full-bleed
                  `<header>` as the positioning ancestor instead, so the
                  panel's hit-box spanned the entire viewport edge to edge —
                  drifting under the search box, currency switcher and account
                  icons. Hovering into that misaligned area handed the pointer
                  to whichever element actually sat there, silently closing
                  the menu, which is why only a click (opening it via keyboard
                  focus, independent of pointer position) reliably "stuck".
              (2) `self-stretch`, cascaded from <nav> above, makes this box as
                  tall as the row itself rather than just the "Shop" text, so
                  there is no dead strip between the word and where the panel
                  begins — the panel starts exactly at this box's own bottom
                  edge, with nothing in between to lose hover over. */}
          <div className="group flex items-center self-stretch">
            <Link href="/shop" className="flex items-center gap-1">
              Shop
              <ChevronDown aria-hidden className="size-4" />
            </Link>

            {/* `-mt-5 pt-5` bridges the header row's own bottom padding.
                `top-full` anchors the panel to the bottom of the row's PADDING
                box, while the stretched trigger above only reaches the bottom
                of its CONTENT box — leaving a dead strip exactly as tall as the
                row's `py-5` that the pointer crossed on its way down, closing
                the menu. Pulling the panel up by that much and padding the
                contents back down puts the hoverable area flush against the
                trigger without moving anything on screen. Measured: the gap was
                20px, which is what `5` is here. If the row's `py-5` changes,
                this has to change with it. */}
            <div className="invisible absolute inset-x-0 top-full z-20 -mt-5 pt-5 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="mx-auto w-full max-w-5xl border border-line bg-surface p-8 shadow-xl">
                <p className="text-sm font-semibold">Shop by category</p>
                <ul className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <Link
                        href={`/shop?category=${category.slug}`}
                        className="text-muted hover:text-foreground"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/shop" className="font-semibold hover:text-muted">
                      View everything
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <Link href="/our-story" className="hover:text-muted">
            {storyTitle ?? "Our Story"}
          </Link>
          <Link href="/blog" className="hover:text-muted">
            Blog
          </Link>
          <Link href="/contact" className="hover:text-muted">
            {contactTitle ?? "Contact Us"}
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <form action="/search" className="hidden xl:block">
            <label className="flex items-center gap-2 border border-line px-3 py-1.5">
              <Search aria-hidden className="size-4 text-muted" />
              <input
                name="q"
                placeholder="Search"
                aria-label="Search products"
                className="w-28 bg-transparent text-sm outline-none lg:w-40"
              />
            </label>
          </form>

          <CurrencySwitcher currencies={currencies} current={currency.code} />

          <MobileNav
            label="Menu"
            links={[
              { href: "/", label: "Home" },
              {
                href: "/shop",
                label: "Shop",
                allLabel: "View everything",
                // Tapping Shop opens the categories in the same panel rather
                // than navigating away.
                children: categories.map((category) => ({
                  href: `/shop?category=${category.slug}`,
                  label: category.name,
                })),
              },
              { href: "/our-story", label: storyTitle ?? "Our Story" },
              { href: "/blog", label: "Blog" },
              { href: "/contact", label: contactTitle ?? "Contact Us" },
              { href: "/cart", label: "Cart" },
              { href: "/account/wishlist", label: "Wishlist" },
              { href: "/account/orders", label: "My Orders" },
              { href: user ? "/account" : "/login", label: user ? "My Account" : "Login" },
            ]}
          >
            <form action="/search">
              <label className="flex items-center gap-2 border border-line px-3 py-2">
                <Search aria-hidden className="size-4 text-muted" />
                <input
                  name="q"
                  placeholder="Search products"
                  aria-label="Search products"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
            </form>
          </MobileNav>

          <Link href="/account/wishlist" aria-label="Wishlist" className="hidden xl:block">
            <Heart aria-hidden className="size-5 text-muted hover:text-foreground" />
          </Link>

          <Minicart
            initialCount={cartCount(cart)}
            initialSubtotal={cartSubtotalKobo(cart)}
            initialItems={cart?.items ?? []}
          />

          {user ? (
            <Link
              href={isStaff(user) ? "/admin" : "/account"}
              className="ml-2 hidden rounded-full bg-brand px-5 py-2 text-sm text-white md:block"
            >
              {user.firstName ?? "Account"}
            </Link>
          ) : (
            <Link
              href="/login"
              className="ml-2 hidden rounded-full bg-brand px-5 py-2 text-sm text-white md:block"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
