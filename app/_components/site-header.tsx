import Link from "next/link";
import { ChevronDown, Heart, Search } from "lucide-react";
import Minicart from "@/app/_components/minicart";
import Logo from "@/app/_components/logo";
import { getSessionUser, isStaff } from "@/lib/auth";

// Copied verbatim from the mockup, on request. None of it reflects the real
// catalogue yet — Kidoclassic sells women's denim, jeans and footwear — and
// none of these are links, because the listing pages behind them do not exist.
// Replace with a real category tree when the taxonomy is settled.
const MEGA_MENU: { heading: string; items: string[] }[][] = [
  [
    {
      heading: "Men",
      items: [
        "T-Shirts",
        "Casual Shirts",
        "Formal Shirts",
        "Jackets",
        "Blazers & Coats",
      ],
    },
    {
      heading: "Indian & Festive Wear",
      items: ["Kurtas & Kurta Sets", "Sherwanis"],
    },
  ],
  [
    {
      heading: "Women",
      items: [
        "Kurtas & Suits",
        "Sarees",
        "Ethnic Wear",
        "Lehenga Cholis",
        "Jackets",
      ],
    },
    { heading: "Western Wear", items: ["Dresses", "Jumpsuits"] },
  ],
  [
    {
      heading: "Footwear",
      items: [
        "Flats",
        "Casual Shoes",
        "Heels",
        "Boots",
        "Sports Shoes & Floaters",
      ],
    },
    {
      heading: "Product Features",
      items: ["360 Product Viewer", "Product with Video"],
    },
  ],
  [
    {
      heading: "Kids",
      items: [
        "T-Shirts",
        "Shirts",
        "Jeans",
        "Trousers",
        "Party Wear",
        "Innerwear & Thermal",
        "Track Pants",
        "Value Pack",
      ],
    },
  ],
];

export default async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="relative border-b-2 border-brand/30 bg-surface">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-5">
        <Logo size={40} />

        <nav className="hidden items-center gap-8 text-sm md:flex">
          <Link href="/" className="hover:text-muted">
            Home
          </Link>

          {/* Opens on hover, and on keyboard focus so it is reachable by tab. */}
          <div className="group static">
            <Link href="/shop" className="flex items-center gap-1">
              Shop
              <ChevronDown aria-hidden className="size-4" />
            </Link>

            <div className="invisible absolute inset-x-0 top-full z-20 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="mx-auto grid w-full max-w-5xl grid-cols-4 gap-8 border border-line bg-surface p-8 shadow-xl">
                {MEGA_MENU.map((column, index) => (
                  <div key={index} className="space-y-7">
                    {column.map((group) => (
                      <div key={group.heading}>
                        <p className="text-sm font-semibold">{group.heading}</p>
                        <ul className="mt-4 space-y-2.5 text-sm text-muted">
                          {group.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* No pages behind these, and they are not among the 26 screens. */}
          <span className="text-muted">Our Story</span>
          <span className="text-muted">Blog</span>
          <span className="text-muted">Contact Us</span>
        </nav>

        <div className="flex items-center gap-4">
          <form action="/search" className="hidden sm:block">
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

          <Link href="/account/wishlist" aria-label="Wishlist">
            <Heart aria-hidden className="size-5 text-muted hover:text-foreground" />
          </Link>

          <Minicart />

          {user ? (
            <Link
              href={isStaff(user) ? "/admin" : "/account"}
              className="ml-2 rounded-full bg-brand px-5 py-2 text-sm text-white"
            >
              {user.firstName ?? "Account"}
            </Link>
          ) : (
            <Link
              href="/login"
              className="ml-2 rounded-full bg-brand px-5 py-2 text-sm text-white"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
