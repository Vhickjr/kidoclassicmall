import Link from "next/link";

const STYLE =
  "mt-7 block w-full rounded-lg bg-brand py-3.5 text-center text-sm text-white";

/** With an `href` this walks to the next screen so the flow can be clicked
 *  through. Without one it is inert: these are UI shells, and authentication is
 *  step 6 of the build order, so there is nothing to submit to yet. */
export default function AuthButton({
  label,
  href,
}: {
  label: string;
  href?: string;
}) {
  if (href) {
    return (
      <Link href={href} className={STYLE}>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" className={STYLE}>
      {label}
    </button>
  );
}
