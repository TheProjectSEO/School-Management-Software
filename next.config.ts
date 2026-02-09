import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Redirect /login to home page since login is now on home
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/",
        permanent: false,
      },
      // Legacy URL redirects (old routes that may still be cached in browsers)
      {
        source: "/teacher/content/modules/:id",
        destination: "/teacher/subjects",
        permanent: false,
      },
      {
        source: "/teacher/assessments/grade/:id",
        destination: "/teacher/grading/:id",
        permanent: false,
      },
    ];
  },

  // Production optimizations
  experimental: {
    optimizePackageImports: ["lucide-react", "@heroicons/react"],
  },

  // Exclude legacy folders from build
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/_legacy/**", "**/apps/**"],
    };
    return config;
  },
};

export default nextConfig;
