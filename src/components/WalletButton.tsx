'use client';

import { useWallet, WalletConnection } from '../providers/WalletProvider';
import { useAccount } from 'wagmi';
import EthWalletButton from './EthWalletButton';
import { useState, useEffect, useRef } from 'react';

// This interface is no longer needed since we're using generic detection

export default function WalletButton() {
  const { 
    isInitializing, 
    isConnected,
    connection,
    connectWallet,
    disconnectWallet 
  } = useWallet();
  
  // Check if we have an ETH connection via RainbowKit
  const { isConnected: isEthConnected } = useAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWalletOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleConnectHedera = async () => {
    setIsConnecting(true);
    setShowWalletOptions(false);
    try {
      await connectWallet('hedera');
    } catch (error) {
      console.error('Failed to connect Hedera wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectBase = async () => {
    setShowWalletOptions(false);
    // Trigger RainbowKit connection programmatically
    const event = new CustomEvent('openRainbowKit');
    window.dispatchEvent(event);
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
  };

  const formatAddress = (connection: WalletConnection) => {
    if (connection.type === 'hedera') {
      const accountId = connection.accountId || '';
      if (accountId.length <= 12) return accountId;
      return `${accountId.slice(0, 6)}...${accountId.slice(-4)}`;
    } else {
      const address = connection.address || '';
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-2 text-sm text-gray-400">Initializing...</span>
      </div>
    );
  }

  // Show ETH wallet connection if connected via RainbowKit
  if (isEthConnected) {
    return <EthWalletButton />;
  }
  
  // Show Hedera wallet connection if connected via WalletProvider
  if (isConnected && connection && connection.type === 'hedera') {
    const operatorAccountId = process.env.NEXT_PUBLIC_LYNX_OPERATOR_ACCOUNT_ID || '';
    const isOperator = !!(
      operatorAccountId &&
      connection.accountId &&
      connection.accountId === operatorAccountId
    );
    const dashboardHref = isOperator ? '/project-dashboard' : '/signer-dashboard';
    const dashboardLabel = isOperator ? 'Project Dashboard' : 'Signer Dashboard';

    return (
      <div className="flex items-center space-x-3">
        <a
          href={dashboardHref}
          className="flex items-center px-4 rounded-lg transition-colors hover:bg-white/10 leading-relaxed"
          style={{ paddingTop: '0.875rem', paddingBottom: '0.75rem' }}
        >
          <div 
            className="w-5 h-5 rounded-full mr-3 flex items-center justify-center"
            style={{ backgroundColor: '#F1BD5C' }}
          >
            <span className="text-black text-sm font-bold leading-none" style={{ paddingTop: '2px' }}>ℏ</span>
          </div>
          <span className="text-base font-bold text-foreground capitalize">{dashboardLabel}</span>
        </a>
        <button
          onClick={handleDisconnect}
          className="text-base text-black bg-white px-8 py-3 rounded-lg hover:opacity-80 transition-opacity leading-relaxed"
          style={{ paddingTop: '0.875rem' }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowWalletOptions(!showWalletOptions)}
        disabled={isConnecting}
        className="text-base text-black bg-white px-8 py-3 rounded-lg hover:opacity-80 transition-opacity leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ paddingTop: '0.875rem' }}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
      
      {showWalletOptions && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          <button
            onClick={handleConnectHedera}
            disabled={isConnecting}
            className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-gray-700 transition-colors border-b border-gray-700 disabled:opacity-50"
          >
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
              Connect Hedera
            </div>
          </button>
          <button
            onClick={handleConnectBase}
            disabled={isConnecting}
            className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              Connect Ethereum
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
