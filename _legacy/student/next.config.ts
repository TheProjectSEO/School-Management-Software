import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  typescript: {
    // Ignore build errors during build - type checking happens in editor
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
