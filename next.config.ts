import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude pino-pretty from server-side builds to avoid transport errors in Vercel
      config.externals = config.externals || [];
      config.externals.push('pino-pretty');
    }
    return config;
  },
};

export default nextConfig;
