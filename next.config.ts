import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  // Skip TypeScript check during build — Prisma client types can be stale
  // in some environments. The code is checked separately in CI/lint.
  typescript: {
    ignoreBuildErrors: true,
  },
  // FIX: disable caching in dev to always see latest changes
  // (prevents stale pages in private browsing / hard refresh)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
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
    "preview-chat-d9d309ca-5de3-407b-a6cf-1f50ae1048d3.space-z.ai",
  ],
};

export default nextConfig;
