import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  // Skip TypeScript check during build — Prisma client types can be stale
  // in some environments. The code is checked separately in CI/lint.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/webp'],
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    localPatterns: [
      {
        pathname: '/images/**',
        search: '',
      },
      {
        pathname: '/images/**',
        search: 'v=*',
      },
      {
        pathname: '/**',
        search: '',
      },
    ],
  },
  allowedDevOrigins: [
    "preview-chat-85c5b960-1b57-4ff4-a65d-6df0767d05e6.space-z.ai",
  ],
};

export default nextConfig;
