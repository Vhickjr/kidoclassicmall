/** lucide-react carries no brand glyphs, so the Instagram mark is inline SVG —
 *  the standard rounded-square camera outline, drawn to match lucide's stroke
 *  conventions (round caps/joins, 2px stroke) so it sits comfortably next to
 *  icons from that set elsewhere in the app. */
export default function InstagramIcon({
  className = "size-4",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
