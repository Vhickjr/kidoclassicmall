import SiteHeader from "@/app/_components/site-header";
import SiteFooter from "@/app/_components/site-footer";
import WhatsAppButton from "@/app/_components/whatsapp-button";
import VerifyEmailBanner from "@/app/_components/verify-email-banner";
import { getSessionUser } from "@/lib/auth";
import { activeCurrency } from "@/lib/currency-server";
import { CurrencyProvider } from "@/app/_components/currency-provider";

export default async function StorefrontLayout({
  children,
}: LayoutProps<"/">) {
  const [user, currency] = await Promise.all([
    getSessionUser(),
    activeCurrency(),
  ]);
  const showBanner = user && !user.emailVerified;

  return (
    <CurrencyProvider currency={currency}>
      <SiteHeader />
      {showBanner && <VerifyEmailBanner />}
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <WhatsAppButton />
    </CurrencyProvider>
  );
}
