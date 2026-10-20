import type { NextConfig } from "next";

// cacheComponents is off: on Cloudflare Workers its staged rendering hangs
// requests (opennextjs/opennextjs-cloudflare#1318). Revisit once that ships.
const nextConfig: NextConfig = {
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
