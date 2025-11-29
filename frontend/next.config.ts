import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from localhost API
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8002',
        pathname: '/static/**',
      },
    ],
  },
  // Disable strict mode for development (removes double renders)
  reactStrictMode: false,
};

export default nextConfig;
