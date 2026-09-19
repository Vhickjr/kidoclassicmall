import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nothing is gained by telling every visitor which framework this is.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stops the site being framed into someone else's page, which is how
          // a checkout gets click-jacked.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Browsers must not second-guess a declared content type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send the origin to other sites, never the full path — order
          // confirmation URLs carry an order id.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing here needs a camera, microphone or location.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },

  images: {
    // Named hosts only. A wildcard here would let anyone use this site's image
    // optimiser as an open proxy for arbitrary URLs.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
