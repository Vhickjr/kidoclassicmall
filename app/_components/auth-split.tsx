import Logo from "@/app/_components/logo";

export default function AuthSplit({
  showLogo = false,
  children,
}: {
  showLogo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* A brand panel rather than stock photography. Swap in a real campaign
          picture here once there is one to use. */}
      <div className="relative hidden bg-gradient-to-br from-brand-soft via-brand-soft/60 to-brand/25 lg:block">
        {showLogo && (
          <span className="absolute left-10 top-8">
            <Logo size={56} showLabel={false} />
          </span>
        )}
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
