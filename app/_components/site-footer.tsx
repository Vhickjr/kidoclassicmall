import { Mail, MapPin, Phone } from "lucide-react";
import Logo from "@/app/_components/logo";

// Every destination below is a screen that does not exist yet, so the columns
// render as text. They become links as those screens land.
const INFORMATION = [
  "My Account",
  "Login",
  "My Cart",
  "My Wishlist",
  "Checkout",
];

const SERVICE = [
  "About Us",
  "Careers",
  "Delivery Information",
  "Privacy Policy",
  "Terms & Conditions",
];

export default function SiteFooter() {
  return (
    <footer className="mt-20 bg-brand-dark text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <Logo size={44} tone="light" />
          <ul className="mt-6 space-y-3 text-sm text-white/75">
            <li className="flex items-center gap-3">
              <Phone aria-hidden className="size-4 shrink-0" />
              (704) 555-0127
            </li>
            <li className="flex items-center gap-3">
              <Mail aria-hidden className="size-4 shrink-0" />
              hello@kidoclassicmall.com
            </li>
            <li className="flex items-start gap-3">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
              Lagos, Nigeria
            </li>
          </ul>
        </div>

        <FooterColumn title="Information" items={INFORMATION} />
        <FooterColumn title="Service" items={SERVICE} />

        <div>
          <h2 className="text-sm font-semibold">Subscribe</h2>
          <p className="mt-5 text-sm text-white/75">
            Enter your email below to be the first to know about new collections
            and product launches.
          </p>
          {/* Not wired up: there is no newsletter list or endpoint yet. */}
          <p className="mt-4 rounded border border-white/30 px-4 py-3 text-sm text-white/50">
            Your Email
          </p>
        </div>
      </div>

      <div className="border-t border-white/20">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-6 text-sm text-white/70 sm:flex-row sm:justify-between">
          <p>Visa &middot; Mastercard &middot; Verve</p>
          <p>
            &copy; {new Date().getFullYear()} Kidoclassic Mall. All rights
            reserved.
          </p>
          <p>Instagram &middot; Facebook &middot; X</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-5 space-y-3 text-sm text-white/75">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
