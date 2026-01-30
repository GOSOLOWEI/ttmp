import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ["@visactor/vchart","lucide-react"],
  },
};

export default nextConfig;
