'use client';

import { useWallet, WalletConnection } from '../providers/WalletProvider';
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
    setIsConnecting(true);
    setShowWalletOptions(false);
    try {
      await connectWallet('base');
    } catch (error) {
      console.error('Failed to connect Base wallet:', error);
    } finally {
      setIsConnecting(false);
    }
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

  if (isConnected && connection) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
          <span className="text-xs text-gray-400 mr-2 capitalize">{connection.type}:</span>
          <span className="text-sm font-medium text-foreground">{formatAddress(connection)}</span>
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowWalletOptions(!showWalletOptions)}
        disabled={isConnecting}
        className="bg-primary text-background px-4 py-2 rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              Connect Base
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
