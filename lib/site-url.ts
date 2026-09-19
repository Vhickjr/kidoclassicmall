/**
 * The site's public origin, used for absolute links in emails, robots.txt and
 * the sitemap. Set NEXT_PUBLIC_SITE_URL in the environment; the fallback only
 * keeps development working.
 */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}
