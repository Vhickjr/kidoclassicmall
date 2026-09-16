import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Named hosts only. A wildcard here would let anyone use this site's image
    // optimiser as an open proxy for arbitrary URLs.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        // Placeholder photography in the seed data; drop this once the real
        // catalogue is uploaded.
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
