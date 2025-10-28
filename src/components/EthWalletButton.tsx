'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { useEffect, useRef } from 'react';

export default function EthWalletButton() {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const connectRef = useRef<{ openConnectModal?: () => void } | null>(null);

  useEffect(() => {
    const handleOpenRainbowKit = () => {
      if (connectRef.current?.openConnectModal) {
        connectRef.current.openConnectModal();
      }
    };

    window.addEventListener('openRainbowKit', handleOpenRainbowKit);
    return () => window.removeEventListener('openRainbowKit', handleOpenRainbowKit);
  }, []);

  // Connected state view
  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-3">
        <a
          href="/signer-dashboard"
          className="flex items-center px-4 rounded-lg transition-colors hover:bg-white/10 leading-relaxed"
          style={{ paddingTop: '0.875rem', paddingBottom: '0.75rem' }}
        >
          <div 
            className="w-5 h-5 rounded-full mr-3"
            style={{ backgroundColor: '#717C2A' }}
          ></div>
          <span className="text-base font-bold text-foreground">Ethereum: Dashboard</span>
        </a>
        <button
          onClick={() => disconnect()}
          className="text-2xl text-black bg-white px-8 py-3 rounded-lg hover:opacity-80 transition-opacity leading-relaxed"
          style={{ paddingTop: '0.875rem' }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        // Store the openConnectModal function in ref for external access
        connectRef.current = { openConnectModal };
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="bg-primary text-background px-4 py-2 rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors"
                  >
                    Connect Ethereum
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={openChainModal}
                    className="flex items-center bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 hover:bg-gray-700 transition-colors"
                  >
                    {chain.hasIcon && (
                      <div
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ background: chain.iconBackground }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            className="w-4 h-4 rounded-full"
                          />
                        )}
                      </div>
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {chain.name}
                    </span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    className="flex items-center bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-400 mr-2">ETH:</span>
                    <span className="text-sm font-medium text-foreground">
                      {account.displayName}
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
