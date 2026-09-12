import SiteHeader from "@/app/_components/site-header";
import SiteFooter from "@/app/_components/site-footer";

export default function StorefrontLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
