'use client';

import { useWallet } from '../providers/WalletProvider';
import { useState } from 'react';

export default function WalletButton() {
  const { connectWallet, disconnectWallet, isConnected, accountId, isInitializing } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
  };

  const formatAccountId = (accountId: string) => {
    if (accountId.length <= 12) return accountId;
    return `${accountId.slice(0, 6)}...${accountId.slice(-4)}`;
  };

  if (isInitializing) {
    return (
      <div className="flex items-center">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-2 text-sm text-gray-400">Initializing...</span>
      </div>
    );
  }

  if (isConnected && accountId) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
          <span className="text-sm font-medium text-foreground">{formatAccountId(accountId)}</span>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-sm text-gray-400 hover:text-foreground transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="bg-primary text-background px-4 py-2 rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
