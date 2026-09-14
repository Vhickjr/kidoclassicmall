import Link from "next/link";
import Image from "next/image";

/** The one place the mark lives. Local file, so next/image needs no remote
 *  pattern and can optimise it properly. */
export default function Logo({
  size = 44,
  href = "/",
  label = "Kidoclassic Mall",
  tone = "dark",
  showLabel = true,
}: {
  size?: number;
  href?: string | null;
  label?: string;
  tone?: "dark" | "light";
  showLabel?: boolean;
}) {
  const mark = (
    <span className="flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        priority
        className="rounded-full"
      />
      {showLabel && (
        <span
          className={`text-lg font-bold tracking-tight ${
            tone === "light" ? "text-background" : ""
          }`}
        >
          {label}
        </span>
      )}
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} aria-label={label}>
      {mark}
    </Link>
  );
}
