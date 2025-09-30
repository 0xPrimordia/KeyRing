import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Replace pino-pretty with a no-op module to avoid transport errors in Vercel
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias['pino-pretty'] = false;
      
      // Also handle any other pino transports that might cause issues
      config.resolve.alias['pino/file'] = false;
      config.resolve.alias['thread-stream'] = false;
    }
    return config;
  },
};

export default nextConfig;
