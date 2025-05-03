import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // This is needed for static export: npm run serve
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;