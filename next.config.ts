import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.kakaocdn.net',
      },
      {
        protocol: 'http',
        hostname: '*.kakaocdn.net',
      },
      {
        protocol: 'https',
        hostname: '*.daumcdn.net',
      },
      {
        protocol: 'http',
        hostname: '*.daumcdn.net',
      },
      {
        protocol: 'https',
        hostname: '*.kakaocorp.com',
      },
      {
        protocol: 'http',
        hostname: '*.kakaocorp.com',
      },
    ],
  },
};

export default nextConfig;
