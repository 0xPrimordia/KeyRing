'use client';

import React from 'react';
import { getDefaultConfig, RainbowKitProvider as RKProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, base, baseSepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { http } from 'wagmi';

const config = getDefaultConfig({
  appName: 'KeyRing Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  chains: [mainnet, base, baseSepolia],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: false, // Disable SSR to avoid hydration issues
});

const queryClient = new QueryClient();

export function RainbowKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RKProvider>
          {children}
        </RKProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
