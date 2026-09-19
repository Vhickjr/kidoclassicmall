import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing here is useful in search results, and some of it is personal.
      disallow: ["/admin", "/api/", "/account/", "/checkout/", "/cart"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
