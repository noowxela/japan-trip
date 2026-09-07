import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  async redirects() {
    return [
      { source: "/budget/new", destination: "/budget", permanent: false },
      { source: "/spend", destination: "/budget", permanent: false },
    ];
  },
};

export default nextConfig;
