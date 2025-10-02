"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DAppConnector } from "@hashgraph/hedera-wallet-connect";
import { LedgerId } from "@hashgraph/sdk";
import { toast } from "sonner";
import { createConfig, http, connect, disconnect, getConnections } from '@wagmi/core';
import { mainnet, sepolia } from 'wagmi/chains';
import { walletConnect, metaMask, coinbaseWallet } from '@wagmi/connectors';

// Types for different wallet connections
export type WalletType = 'hedera' | 'ethereum';

export interface HederaConnection {
  type: 'hedera';
  accountId: string;
  publicKey: string | null;
  sessionTopic: string | null;
}

export interface EthereumConnection {
  type: 'ethereum';
  address: string;
  chainId: number;
}

export type WalletConnection = HederaConnection | EthereumConnection;

interface MultiWalletContextProps {
  // Hedera-specific
  dAppConnector: DAppConnector | null;
  
  // General wallet state
  isInitializing: boolean;
  connections: WalletConnection[];
  activeConnection: WalletConnection | null;
  
  // Connection methods
  connectHederaWallet: () => Promise<HederaConnection | null>;
  connectEthereumWallet: () => Promise<EthereumConnection | null>;
  switchConnection: (connection: WalletConnection) => void;
  disconnectWallet: (connection: WalletConnection) => Promise<void>;
  disconnectAll: () => Promise<void>;
  
  // Utility methods
  getHederaPublicKey: (accountId: string) => Promise<string | null>;
}

export const MultiWalletContext = createContext<MultiWalletContextProps>({
  dAppConnector: null,
  isInitializing: false,
  connections: [],
  activeConnection: null,
  connectHederaWallet: async () => null,
  connectEthereumWallet: async () => null,
  switchConnection: () => {},
  disconnectWallet: async () => {},
  disconnectAll: async () => {},
  getHederaPublicKey: async () => null,
});

export const useMultiWallet = () => useContext(MultiWalletContext);

// Wagmi configuration for Ethereum wallets
const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    walletConnect({ 
      projectId: PROJECT_ID,
      metadata: {
        name: "KeyRing Protocol",
        description: "KeyRing Protocol - Multi-Chain Trust Layer",
        url: typeof window !== "undefined" ? window.location.href : "",
        icons: ["/keyring-logo.png"],
      }
    }),
    metaMask(),
    coinbaseWallet({ appName: "KeyRing Protocol" }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

// Hedera WalletConnect metadata
const HEDERA_METADATA = {
  name: "KeyRing Protocol",
  description: "KeyRing Protocol - Hedera Trust Layer for Threshold Keys",
  url: typeof window !== "undefined" ? window.location.href : "",
  icons: ["/keyring-logo.png"],
};

export const MultiWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [dAppConnector, setDAppConnector] = useState<DAppConnector | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [connections, setConnections] = useState<WalletConnection[]>([]);
  const [activeConnection, setActiveConnection] = useState<WalletConnection | null>(null);
  const initialized = React.useRef(false);

  useEffect(() => {
    const initWallets = async () => {
      if (initialized.current) return;
      initialized.current = true;

      try {
        setIsInitializing(true);

        // Initialize Hedera WalletConnect
        await initHederaWallet();
        
        // Check for existing Ethereum connections
        await checkExistingEthereumConnections();

      } catch (error) {
        console.error("[MULTI-WALLET] Failed to initialize wallets:", error);
        toast.error("Failed to initialize wallets");
      } finally {
        setIsInitializing(false);
      }
    };

    initWallets();
  }, []);

  const initHederaWallet = useCallback(async () => {
    try {
      // Determine network based on environment
      const isMainnet = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet';
      const network = isMainnet ? LedgerId.MAINNET : LedgerId.TESTNET;
      
      console.log("[HEDERA WALLET] Network Config:", {
        NEXT_PUBLIC_HEDERA_NETWORK: process.env.NEXT_PUBLIC_HEDERA_NETWORK,
        isMainnet,
        network: network.toString()
      });

      // Create DAppConnector with proper configuration
      const connector = new DAppConnector(
        HEDERA_METADATA,
        network,
        PROJECT_ID
      );

      // Initialize with timeout
      const initPromise = connector.init();
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error("Hedera wallet initialization timed out")), 10000);
      });

      await Promise.race([initPromise, timeoutPromise]);
      setDAppConnector(connector);

      // Set up event handlers for session management
      if (connector.walletConnectClient) {
        // Handle session establishment
        connector.walletConnectClient.on("session_proposal", () => {
          console.log("[HEDERA WALLET] Session proposed");
        });

        // Handle session updates
        connector.walletConnectClient.on("session_update", ({ topic, params }) => {
          try {
            const namespace = Object.values(params.namespaces)[0];
            if (namespace?.accounts?.length) {
              const accountIdString = namespace.accounts[0].split(':')[2];
              updateHederaConnection(accountIdString, topic);
            }
          } catch (error) {
            console.error("[HEDERA WALLET] Error updating session:", error);
          }
        });

        // Handle disconnection events
        connector.walletConnectClient.on("session_delete", ({ topic }) => {
          removeHederaConnection(topic);
        });

        // Try to restore existing session
        const sessions = connector.walletConnectClient.session.getAll();
        if (sessions.length > 0) {
          const latestSession = sessions[sessions.length - 1];
          try {
            const namespace = Object.values(latestSession.namespaces)[0];
            if (namespace?.accounts?.length) {
              const accountIdString = namespace.accounts[0].split(':')[2];
              const hederaConnection: HederaConnection = {
                type: 'hedera',
                accountId: accountIdString,
                publicKey: null,
                sessionTopic: latestSession.topic
              };
              
              setConnections(prev => [...prev, hederaConnection]);
              setActiveConnection(hederaConnection);
              
              console.log("[HEDERA WALLET] Session restored for account:", accountIdString);
              toast.success(`Reconnected to Hedera: ${accountIdString}`);
            }
          } catch (error) {
            console.error("[HEDERA WALLET] Error restoring session:", error);
          }
        }
      }
    } catch (error) {
      console.error("[HEDERA WALLET] Failed to initialize:", error);
    }
  }, []);

  const checkExistingEthereumConnections = async () => {
    try {
      const existingConnections = getConnections(wagmiConfig);
      
      for (const connection of existingConnections) {
        if (connection.accounts.length > 0) {
          const ethConnection: EthereumConnection = {
            type: 'ethereum',
            address: connection.accounts[0],
            chainId: connection.chainId
          };
          
          setConnections(prev => [...prev, ethConnection]);
          
          // Set as active if no active connection
          setActiveConnection(prev => prev || ethConnection);
          
          console.log("[ETHEREUM WALLET] Restored connection:", ethConnection);
        }
      }
    } catch (error) {
      console.error("[ETHEREUM WALLET] Error checking existing connections:", error);
    }
  };

  const connectHederaWallet = async (): Promise<HederaConnection | null> => {
    if (!dAppConnector) {
      console.error("[HEDERA WALLET] Wallet connector not initialized");
      toast.error("Hedera wallet not initialized");
      return null;
    }

    try {
      console.log("[HEDERA WALLET] Starting connection process");
      
      const session = await dAppConnector.openModal();
      console.log("[HEDERA WALLET] Session established:", session.topic);

      // Extract account information from the session
      const namespace = Object.values(session.namespaces)[0];
      if (namespace?.accounts?.length) {
        const accountIdString = namespace.accounts[0].split(':')[2];
        
        const hederaConnection: HederaConnection = {
          type: 'hedera',
          accountId: accountIdString,
          publicKey: null,
          sessionTopic: session.topic
        };

        setConnections(prev => {
          // Remove any existing Hedera connection and add the new one
          const filtered = prev.filter(conn => conn.type !== 'hedera');
          return [...filtered, hederaConnection];
        });
        
        setActiveConnection(hederaConnection);

        console.log("[HEDERA WALLET] Connected successfully:", accountIdString);
        toast.success(`Connected to Hedera: ${accountIdString}`);
        
        return hederaConnection;
      }
      return null;
    } catch (error) {
      console.error("[HEDERA WALLET] Failed to connect:", error);
      toast.error("Failed to connect to Hedera wallet");
      return null;
    }
  };

  const connectEthereumWallet = async (): Promise<EthereumConnection | null> => {
    try {
      console.log("[ETHEREUM WALLET] Starting connection process");
      
      // Try to connect with WalletConnect first, then fallback to MetaMask
      const result = await connect(wagmiConfig, { 
        connector: wagmiConfig.connectors.find(c => c.id === 'walletConnect') || wagmiConfig.connectors[0]
      });

      if (result.accounts.length > 0) {
        const ethConnection: EthereumConnection = {
          type: 'ethereum',
          address: result.accounts[0],
          chainId: result.chainId
        };

        setConnections(prev => {
          // Remove any existing Ethereum connection and add the new one
          const filtered = prev.filter(conn => conn.type !== 'ethereum');
          return [...filtered, ethConnection];
        });
        
        setActiveConnection(ethConnection);

        console.log("[ETHEREUM WALLET] Connected successfully:", ethConnection);
        toast.success(`Connected to Ethereum: ${ethConnection.address.slice(0, 6)}...${ethConnection.address.slice(-4)}`);
        
        return ethConnection;
      }
      return null;
    } catch (error) {
      console.error("[ETHEREUM WALLET] Failed to connect:", error);
      toast.error("Failed to connect to Ethereum wallet");
      return null;
    }
  };

  const switchConnection = (connection: WalletConnection) => {
    setActiveConnection(connection);
    console.log("[MULTI-WALLET] Switched to connection:", connection);
  };

  const disconnectWallet = async (connection: WalletConnection): Promise<void> => {
    try {
      if (connection.type === 'hedera') {
        if (dAppConnector && connection.sessionTopic) {
          await dAppConnector.disconnectAll();
        }
        removeHederaConnection(connection.sessionTopic);
      } else if (connection.type === 'ethereum') {
        await disconnect(wagmiConfig);
        setConnections(prev => prev.filter(conn => 
          !(conn.type === 'ethereum' && conn.address === connection.address)
        ));
      }

      // Update active connection if we disconnected it
      if (activeConnection && 
          ((activeConnection.type === 'hedera' && connection.type === 'hedera') ||
           (activeConnection.type === 'ethereum' && connection.type === 'ethereum' && 
            activeConnection.address === connection.address))) {
        const remainingConnections = connections.filter(conn => {
          if (conn.type !== connection.type) return true;
          if (conn.type === 'hedera' && connection.type === 'hedera') {
            return conn.sessionTopic !== connection.sessionTopic;
          }
          if (conn.type === 'ethereum' && connection.type === 'ethereum') {
            return conn.address !== connection.address;
          }
          return true;
        });
        setActiveConnection(remainingConnections[0] || null);
      }

      toast.success(`Disconnected from ${connection.type} wallet`);
    } catch (error) {
      console.error(`[${connection.type.toUpperCase()} WALLET] Error disconnecting:`, error);
      toast.error(`Error disconnecting ${connection.type} wallet`);
    }
  };

  const disconnectAll = async (): Promise<void> => {
    const disconnectPromises = connections.map(conn => disconnectWallet(conn));
    await Promise.allSettled(disconnectPromises);
    setConnections([]);
    setActiveConnection(null);
  };

  const getHederaPublicKey = async (accountId: string): Promise<string | null> => {
    if (!dAppConnector?.walletConnectClient) {
      console.error("[HEDERA WALLET] No WalletConnect client available");
      return null;
    }

    try {
      console.log("[HEDERA WALLET] Getting public key for account:", accountId);
      
      // Use the existing API route
      const response = await fetch('/api/get-public-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });
      
      const data = await response.json();
      
      if (data.success && data.publicKey) {
        // Update the connection with the public key
        setConnections(prev => prev.map(conn => {
          if (conn.type === 'hedera' && conn.accountId === accountId) {
            return { ...conn, publicKey: data.publicKey };
          }
          return conn;
        }));
        
        console.log("[HEDERA WALLET] Public key obtained");
        return data.publicKey;
      } else {
        console.error("[HEDERA WALLET] API failed to get public key:", data.error);
        return null;
      }
      
    } catch (error) {
      console.error("[HEDERA WALLET] Failed to get public key:", error);
      return null;
    }
  };

  // Helper functions
  const updateHederaConnection = useCallback((accountId: string, sessionTopic: string) => {
    setConnections(prev => prev.map(conn => {
      if (conn.type === 'hedera' && conn.sessionTopic === sessionTopic) {
        return { ...conn, accountId };
      }
      return conn;
    }));
  }, []);

  const removeHederaConnection = useCallback((sessionTopic: string | null) => {
    setConnections(prev => prev.filter(conn => 
      !(conn.type === 'hedera' && conn.sessionTopic === sessionTopic)
    ));
    
    if (activeConnection?.type === 'hedera' && activeConnection.sessionTopic === sessionTopic) {
      const remainingConnections = connections.filter(conn => 
        !(conn.type === 'hedera' && conn.sessionTopic === sessionTopic)
      );
      setActiveConnection(remainingConnections[0] || null);
    }
  }, [activeConnection, connections]);

  return (
    <MultiWalletContext.Provider
      value={{
        dAppConnector,
        isInitializing,
        connections,
        activeConnection,
        connectHederaWallet,
        connectEthereumWallet,
        switchConnection,
        disconnectWallet,
        disconnectAll,
        getHederaPublicKey,
      }}
    >
      {children}
    </MultiWalletContext.Provider>
  );
};
