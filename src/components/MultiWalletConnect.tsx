"use client";

import React from 'react';
import { useMultiWallet, WalletConnection } from '../providers/MultiWalletProvider';

export const MultiWalletConnect = () => {
  const {
    isInitializing,
    connections,
    activeConnection,
    connectHederaWallet,
    connectEthereumWallet,
    switchConnection,
    disconnectWallet,
    disconnectAll,
  } = useMultiWallet();

  const handleConnectHedera = async () => {
    const connection = await connectHederaWallet();
    if (connection) {
      console.log('Hedera wallet connected:', connection);
    }
  };

  const handleConnectEthereum = async () => {
    const connection = await connectEthereumWallet();
    if (connection) {
      console.log('Ethereum wallet connected:', connection);
    }
  };

  const handleDisconnect = async (connection: WalletConnection) => {
    await disconnectWallet(connection);
  };

  const formatAddress = (connection: WalletConnection) => {
    if (connection.type === 'hedera') {
      return connection.accountId;
    } else {
      return `${connection.address.slice(0, 6)}...${connection.address.slice(-4)}`;
    }
  };

  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 1: return 'Ethereum Mainnet';
      case 11155111: return 'Sepolia Testnet';
      default: return `Chain ${chainId}`;
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Initializing wallets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900">Multi-Chain Wallet</h2>
      
      {/* Connection Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleConnectHedera}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          disabled={connections.some(c => c.type === 'hedera')}
        >
          {connections.some(c => c.type === 'hedera') ? 'Hedera Connected' : 'Connect Hedera'}
        </button>
        
        <button
          onClick={handleConnectEthereum}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          disabled={connections.some(c => c.type === 'ethereum')}
        >
          {connections.some(c => c.type === 'ethereum') ? 'Ethereum Connected' : 'Connect Ethereum'}
        </button>
      </div>

      {/* Active Connection */}
      {activeConnection && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="font-semibold text-green-800">Active Connection</h3>
          <div className="mt-2 text-sm text-green-700">
            <div className="flex items-center space-x-2">
              <span className="font-medium capitalize">{activeConnection.type}:</span>
              <span className="font-mono">{formatAddress(activeConnection)}</span>
              {activeConnection.type === 'ethereum' && (
                <span className="text-xs bg-green-100 px-2 py-1 rounded">
                  {getChainName(activeConnection.chainId)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Connections */}
      {connections.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Connected Wallets</h3>
          {connections.map((connection, index) => (
            <div
              key={index}
              className={`p-3 border rounded-md flex items-center justify-between ${
                activeConnection === connection 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  connection.type === 'hedera' ? 'bg-purple-500' : 'bg-blue-500'
                }`}></div>
                <div>
                  <div className="font-medium capitalize">{connection.type}</div>
                  <div className="text-sm text-gray-600 font-mono">
                    {formatAddress(connection)}
                  </div>
                  {connection.type === 'ethereum' && (
                    <div className="text-xs text-gray-500">
                      {getChainName(connection.chainId)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                {activeConnection !== connection && (
                  <button
                    onClick={() => switchConnection(connection)}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  >
                    Switch
                  </button>
                )}
                <button
                  onClick={() => handleDisconnect(connection)}
                  className="px-3 py-1 text-sm bg-red-200 text-red-700 rounded hover:bg-red-300 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disconnect All */}
      {connections.length > 1 && (
        <button
          onClick={disconnectAll}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Disconnect All Wallets
        </button>
      )}

      {/* No Connections */}
      {connections.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No wallets connected</p>
          <p className="text-sm mt-1">Connect a Hedera or Ethereum wallet to get started</p>
        </div>
      )}
    </div>
  );
};
