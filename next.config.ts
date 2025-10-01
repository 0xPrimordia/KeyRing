import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@hashgraphonline/standards-sdk'],
  serverComponentsExternalPackages: ['pino-pretty'],
  webpack(config) {
    // resolve not found .next/worker.js issue
    config.externals.push({ 'thread-stream': 'commonjs thread-stream', pino: 'commonjs pino' });

    return config;
  },
};

export default nextConfig;
