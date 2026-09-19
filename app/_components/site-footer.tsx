import { Mail, MapPin, Phone } from "lucide-react";
import Logo from "@/app/_components/logo";
import Link from "next/link";
import SubscribeForm from "@/app/_components/subscribe-form";
import InstagramIcon from "@/app/_components/instagram-icon";
import { footerLinks } from "@/lib/site-content";

export default async function SiteFooter() {
  const columns = await footerLinks();

  return (
    <footer className="mt-20 bg-brand-dark text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <Logo size={44} tone="light" />
          <ul className="mt-6 space-y-3 text-sm text-white/75">
            <li className="flex items-center gap-3">
              <Phone aria-hidden className="size-4 shrink-0" />
              +234 816 363 1011
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

        <FooterColumn title="Information" items={columns.information} />
        <FooterColumn title="Service" items={columns.service} />

        <div>
          <h2 className="text-sm font-semibold">Subscribe</h2>
          <p className="mt-5 text-sm text-white/75">
            Enter your email below to be the first to know about new collections
            and product launches.
          </p>
          <SubscribeForm />
        </div>
      </div>

      <div className="border-t border-white/20">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-6 text-sm text-white/70 sm:flex-row sm:justify-between">
          <p>Visa &middot; Mastercard &middot; Verve &middot; Bank Transfer</p>
          <p>
            &copy; {new Date().getFullYear()} Kidoclassic Mall. All rights
            reserved.
          </p>
          <a
            href="https://www.instagram.com/kidoclassic_mall"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Kidoclassic Mall on Instagram"
            className="flex items-center gap-2 hover:text-white"
          >
            <InstagramIcon className="size-4" />
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-5 space-y-3 text-sm text-white/75">
        {items.map((item) => (
          <li key={item.href + item.label}>
            <Link href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
