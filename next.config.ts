import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Lets other devices on the home network open the dev server by the Mac's
  // address (for example http://192.168.88.11:3000). Without this, Next.js
  // blocks its own scripts and the page never starts.
  allowedDevOrigins: ["192.168.88.11", "192.168.88.*"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.akamai.steamstatic.com",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
