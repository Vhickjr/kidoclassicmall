import Link from "next/link";

// Placeholder photography, same as the storefront.
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/1200/1400`;

export default function AuthSplit({
  photoSeed,
  showLogo = false,
  children,
}: {
  photoSeed: string;
  showLogo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo(photoSeed)}
          alt=""
          className="h-full w-full bg-line/40 object-cover"
        />
        {showLogo && (
          <Link
            href="/"
            className="absolute left-10 top-8 text-2xl font-bold tracking-tight"
          >
            Kidoclassic
          </Link>
        )}
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
