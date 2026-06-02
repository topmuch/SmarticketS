import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
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
