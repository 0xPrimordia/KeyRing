"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DAppConnector } from "@hashgraph/hedera-wallet-connect";
import { LedgerId } from "@hashgraph/sdk";
import { toast } from "sonner";
import { createConfig, http, connect, getAccount, getConnections } from '@wagmi/core';
import { base, baseSepolia } from 'viem/chains';

// Type for Ethereum provider detection
interface EthereumProvider {
  request?: (args: { method: string; params?: any[] }) => Promise<any>;
}

// Types for different wallet connections
export type WalletType = 'hedera' | 'base';

export interface WalletConnection {
  type: WalletType;
  accountId?: string; // For Hedera
  address?: string; // For Base
  publicKey?: string | null; // For Hedera
  chainId?: number; // For Base
}

interface WalletContextProps {
  dAppConnector: DAppConnector | null;
  isInitializing: boolean;
  isConnected: boolean;
  connection: WalletConnection | null;
  connectWallet: (type?: WalletType) => Promise<WalletConnection | null>;
  getPublicKey: (accountId: string) => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
  
  // Legacy compatibility
  accountId: string | null;
  publicKey: string | null;
}

export const WalletContext = createContext<WalletContextProps>({
  dAppConnector: null,
  isInitializing: false,
  isConnected: false,
  connection: null,
  connectWallet: async () => null,
  getPublicKey: async () => null,
  disconnectWallet: async () => {},
  // Legacy compatibility
  accountId: null,
  publicKey: null,
});

export const useWallet = () => useContext(WalletContext);

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
const METADATA = {
  name: "KeyRing Protocol",
  description: "KeyRing Protocol - Multi-Chain Trust Layer for Threshold Keys",
  url: typeof window !== "undefined" ? window.location.href : "",
  icons: ["/keyring-logo.png"],
};

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  // Create minimal wagmi config without WalletConnect to avoid conflicts
  const wagmiConfig = React.useMemo(() => createConfig({
    chains: [base, baseSepolia],
    connectors: [], // No connectors - we use direct window.ethereum
    transports: {
      [base.id]: http(),
      [baseSepolia.id]: http(),
    },
  }), []);
  const [dAppConnector, setDAppConnector] = useState<DAppConnector | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hederaInitialized, setHederaInitialized] = useState(false);
  const [ethereumChecked, setEthereumChecked] = useState(false);
  const [ethereumDisconnected, setEthereumDisconnected] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [sessionTopic, setSessionTopic] = useState<string | null>(null);
  const initialized = React.useRef(false);

  // Legacy compatibility - derive from connection
  const accountId = connection?.type === 'hedera' ? connection.accountId || null : null;
  const publicKey = connection?.type === 'hedera' ? connection.publicKey || null : null;

  useEffect(() => {
    const initWalletConnect = async () => {
      if (initialized.current) {
        console.log("[KEYRING WALLET] Already initialized, skipping");
        return;
      }
      initialized.current = true;

      try {
        setIsInitializing(true);

        // Determine network based on environment
        const isMainnet = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet';
        const network = isMainnet ? LedgerId.MAINNET : LedgerId.TESTNET;
        
        console.log("[KEYRING WALLET] Network Config:", {
          NEXT_PUBLIC_HEDERA_NETWORK: process.env.NEXT_PUBLIC_HEDERA_NETWORK,
          isMainnet,
          network: network.toString()
        });

        // Create DAppConnector with proper configuration
        const connector = new DAppConnector(
          METADATA,
          network,
          PROJECT_ID
        );
        
        // Configure the connector to use the correct network namespace
        // This ensures HashPack shows accounts from the correct network
        if (connector.walletConnectModal) {
          const chainId = `hedera:${isMainnet ? 'mainnet' : 'testnet'}`;
          console.log("[KEYRING WALLET] Configuring WalletConnect for chain:", chainId);
        }

        // Initialize with timeout
        const initPromise = connector.init();
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error("Wallet initialization timed out")), 10000);
        });

        await Promise.race([initPromise, timeoutPromise]);
        setDAppConnector(connector);

        // Set up event handlers for session management
        if (connector.walletConnectClient) {
          // Handle session establishment
          connector.walletConnectClient.on("session_proposal", () => {
            console.log("[KEYRING WALLET] Session proposed");
          });

          // Handle session updates
          connector.walletConnectClient.on("session_update", ({ topic, params }) => {
            if (topic === sessionTopic) {
              try {
                const namespace = Object.values(params.namespaces)[0];
                if (namespace?.accounts?.length) {
                  const accountIdString = namespace.accounts[0].split(':')[2];
                setConnection({
                  type: 'hedera',
                  accountId: accountIdString,
                  publicKey: null
                });
                }
              } catch (error) {
                console.error("[KEYRING WALLET] Error updating session:", error);
              }
            }
          });

          // Handle disconnection events
          connector.walletConnectClient.on("session_delete", ({ topic }) => {
            if (topic === sessionTopic) {
              setIsConnected(false);
              setConnection(null);
              setSessionTopic(null);
            }
          });

          // Try to restore existing Hedera session
          const sessions = connector.walletConnectClient.session.getAll();
          if (sessions.length > 0) {
            const latestSession = sessions[sessions.length - 1];
            setSessionTopic(latestSession.topic);

            try {
              const namespace = Object.values(latestSession.namespaces)[0];
              if (namespace?.accounts?.length) {
                const accountIdString = namespace.accounts[0].split(':')[2];
                setConnection({
                  type: 'hedera',
                  accountId: accountIdString,
                  publicKey: null
                });
                setIsConnected(true);
                
                console.log("[KEYRING WALLET] Hedera session restored for account:", accountIdString);
                toast.success(`Reconnected to KeyRing: ${accountIdString}`);
              }
            } catch (error) {
              console.error("[KEYRING WALLET] Error restoring Hedera session:", error);
            }
          }
        }

        // Check for existing Ethereum connections and restore if found
        try {
          const account = getAccount(wagmiConfig);
          if (account.isConnected && account.address) {
            setConnection({
              type: 'base',
              address: account.address,
              chainId: account.chainId
            });
            setIsConnected(true);
            
            console.log("[BASE WALLET] Ethereum session restored for address:", account.address);
            toast.success(`Reconnected to Base: ${account.address.slice(0, 6)}...${account.address.slice(-4)}`);
          }
        } catch (error) {
          console.error("[BASE WALLET] Error restoring Ethereum session:", error);
        }

      } catch (error) {
        console.error("[KEYRING WALLET] Failed to initialize wallet connect:", error);
        toast.error("Failed to initialize KeyRing wallet");
      } finally {
        setHederaInitialized(true);
      }
    };

    initWalletConnect();
  }, [sessionTopic]);

  // Separate effect to monitor Ethereum account changes
  useEffect(() => {
    const checkEthereumConnection = async () => {
      try {
        // Don't restore connection if user manually disconnected
        if (ethereumDisconnected) {
          return;
        }
        
        // Check if window.ethereum exists
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          // Only check accounts if we don't already have a connection
          // This reduces the frequency of eth_accounts calls
          if (!connection || connection.type !== 'base') {
            try {
              const accounts = await (window as any).ethereum.request({
                method: 'eth_accounts', // This doesn't prompt, just returns connected accounts
              });
              
              if (accounts && accounts.length > 0) {
                const currentAddress = accounts[0];
                const chainId = await (window as any).ethereum.request({
                  method: 'eth_chainId',
                });
                
                setConnection({
                  type: 'base',
                  address: currentAddress,
                  chainId: parseInt(chainId, 16)
                });
                setIsConnected(true);
                console.log("[BASE WALLET] Ethereum account restored:", currentAddress);
              }
            } catch (ethError) {
              // Silently ignore errors to avoid spam
              console.log("[BASE WALLET] No Ethereum accounts available");
            }
          }
        } else if (connection?.type === 'base') {
          // No ethereum provider, disconnect
          setConnection(null);
          setIsConnected(false);
        }
      } catch (error) {
        console.error("[BASE WALLET] Error checking Ethereum connection:", error);
      }
    };

    // Check immediately
    checkEthereumConnection().then(() => {
      // Mark Ethereum as checked after first check
      if (!ethereumChecked) {
        setEthereumChecked(true);
      }
    });

    // Set up event listeners for account changes (more efficient than polling)
    const handleAccountsChanged = (accounts: string[]) => {
      console.log("[BASE WALLET] Accounts changed:", accounts);
      
      // Don't auto-reconnect if user manually disconnected
      if (ethereumDisconnected) {
        return;
      }
      
      if (accounts.length > 0) {
        // Account connected or switched
        if (!connection || connection.type !== 'base' || connection.address !== accounts[0]) {
          (window as any).ethereum.request({ method: 'eth_chainId' }).then((chainId: string) => {
            setConnection({
              type: 'base',
              address: accounts[0],
              chainId: parseInt(chainId, 16)
            });
            setIsConnected(true);
          });
        }
      } else {
        // Account disconnected from wallet extension
        if (connection?.type === 'base') {
          setConnection(null);
          setIsConnected(false);
          setEthereumDisconnected(true); // Mark as manually disconnected
        }
      }
    };

    // Add event listener if ethereum provider exists
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
    }

    // Fallback interval check (much less frequent)
    const interval = setInterval(() => {
      checkEthereumConnection();
    }, 5000); // Every 5 seconds instead of 1 second

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [connection, ethereumChecked, ethereumDisconnected]);

  // Set isInitializing to false only when both Hedera and Ethereum checks are complete
  useEffect(() => {
    if (hederaInitialized && ethereumChecked) {
      setIsInitializing(false);
    }
  }, [hederaInitialized, ethereumChecked]);

  const connectWallet = async (type: WalletType = 'hedera'): Promise<WalletConnection | null> => {
    if (type === 'base') {
      return await connectBaseWallet();
    } else {
      return await connectHederaWallet();
    }
  };

  const connectHederaWallet = async (): Promise<WalletConnection | null> => {
    if (!dAppConnector) {
      console.error("[KEYRING WALLET] Wallet connector not initialized");
      toast.error("KeyRing wallet not initialized");
      return null;
    }

    try {
      console.log("[KEYRING WALLET] Starting wallet connection process");
      
      // Step 2: Log connector state for debugging
      console.log("[KEYRING WALLET] Connector state before connection:", {
        isInitialized: !!dAppConnector,
        hasWalletConnectClient: !!dAppConnector?.walletConnectClient,
        existingSessions: dAppConnector.walletConnectClient?.session?.getAll()?.length || 0,
        methods: Object.getOwnPropertyNames(dAppConnector)
      });
      
      // Step 3: THE CRITICAL CALL - This opens HashPack popup
      console.log("[KEYRING WALLET] About to call openModal() - Network check:", {
        NEXT_PUBLIC_HEDERA_NETWORK: process.env.NEXT_PUBLIC_HEDERA_NETWORK,
        connectorNetwork: dAppConnector.network?.toString(),
        expectedChainId: `hedera:${process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet'}`
      });
      
      const session = await dAppConnector.openModal();
      console.log("[KEYRING WALLET] Session returned:", {
        topic: session.topic,
        namespaces: Object.keys(session.namespaces),
        accounts: Object.values(session.namespaces)[0]?.accounts
      });
      setSessionTopic(session.topic);

      // Extract account information from the session
      const namespace = Object.values(session.namespaces)[0];
      if (namespace?.accounts?.length) {
        // Extract accountId from "hedera:network:0.0.XXXXX" format
        const fullAccountString = namespace.accounts[0];
        const parts = fullAccountString.split(':');
        const networkFromAccount = parts[1]; // testnet or mainnet
        const accountIdString = parts[2];
        
        console.log("[KEYRING WALLET] Account connection details:", {
          fullAccountString,
          networkFromAccount,
          accountId: accountIdString,
          expectedNetwork: process.env.NEXT_PUBLIC_HEDERA_NETWORK,
          networkMismatch: networkFromAccount !== process.env.NEXT_PUBLIC_HEDERA_NETWORK
        });
        
        const hederaConnection: WalletConnection = {
          type: 'hedera',
          accountId: accountIdString,
          publicKey: null
        };
        
        setConnection(hederaConnection);
        setIsConnected(true);

        console.log("[KEYRING WALLET] Wallet connected successfully:", accountIdString);
        toast.success(`Connected to KeyRing: ${accountIdString}`);
        
        return hederaConnection;
      }
      return null;
    } catch (error) {
      console.error("[KEYRING WALLET] Failed to connect wallet:", error);
      toast.error("Failed to connect to KeyRing wallet");
      return null;
    }
  };

  const connectBaseWallet = async (): Promise<WalletConnection | null> => {
    try {
      console.log("[BASE WALLET] Starting Base wallet connection process");
      
      // Check if window.ethereum exists (browser extension detected)
      const hasEthereumProvider = typeof window !== 'undefined' && 
        (window as any).ethereum && 
        typeof (window as any).ethereum.request === 'function';
      
      if (hasEthereumProvider) {
        try {
          console.log("[BASE WALLET] Detected browser extension, requesting accounts directly");
          
          // Request accounts directly from window.ethereum
          const accounts = await (window as any).ethereum.request({
            method: 'eth_requestAccounts',
          });
          
          if (accounts && accounts.length > 0) {
            // Get chain ID
            const chainId = await (window as any).ethereum.request({
              method: 'eth_chainId',
            });
            
            const baseConnection: WalletConnection = {
              type: 'base',
              address: accounts[0],
              chainId: parseInt(chainId, 16)
            };

            setConnection(baseConnection);
            setIsConnected(true);
            setEthereumDisconnected(false); // Reset disconnected flag

            console.log("[BASE WALLET] Connected via browser extension:", baseConnection);
            toast.success(`Connected to Base: ${baseConnection.address?.slice(0, 6)}...${baseConnection.address?.slice(-4)}`);
            
            return baseConnection;
          }
        } catch (injectedError) {
          console.log("[BASE WALLET] Direct ethereum request failed, trying WalletConnect:", injectedError);
        }
      }
      
      // If direct connection failed, show error
      throw new Error("No Ethereum wallet detected. Please install MetaMask, Rainbow, or another Ethereum wallet.");
    } catch (error) {
      console.error("[BASE WALLET] Failed to connect:", error);
      toast.error("Failed to connect to Base wallet");
      return null;
    }
  };

  const getPublicKey = async (accountId: string): Promise<string | null> => {
    if (!dAppConnector?.walletConnectClient) {
      console.error("[KEYRING WALLET] No WalletConnect client available");
      return null;
    }

    try {
      console.log("[KEYRING WALLET] Getting public key from session for account:", accountId);
      
      // Get the current session
      const sessions = dAppConnector.walletConnectClient.session.getAll();
      if (sessions.length === 0) {
        console.error("[KEYRING WALLET] No active sessions");
        return null;
      }

      const session = sessions[sessions.length - 1]; // Get the latest session
      const namespace = Object.values(session.namespaces)[0];
      
      if (!namespace?.accounts?.length) {
        console.error("[KEYRING WALLET] No accounts in session");
        return null;
      }

      // Find the account in the session
      const targetAccount = namespace.accounts.find(acc => acc.includes(accountId));
      if (!targetAccount) {
        console.error("[KEYRING WALLET] Account not found in session:", accountId);
        return null;
      }

      // Try to get public key from session metadata or make a simple query
      // For now, let's use the API route but with better error handling
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
        setConnection(prev => prev && prev.type === 'hedera' ? {
          ...prev,
          publicKey: data.publicKey
        } : prev);
        
        console.log("[KEYRING WALLET] Public key obtained:", data.publicKey.substring(0, 20) + "...");
        return data.publicKey;
      } else {
        console.error("[KEYRING WALLET] API failed to get public key:", data.error);
        return null;
      }
      
    } catch (error) {
      console.error("[KEYRING WALLET] Failed to get public key:", error);
      return null;
    }
  };

  const disconnectWallet = async (): Promise<void> => {
    if (!connection) {
      console.log("[WALLET] No active connection to disconnect");
      return;
    }

    try {
      if (connection.type === 'hedera') {
        if (dAppConnector && sessionTopic) {
      await dAppConnector.disconnectAll();
        }
      } else if (connection.type === 'base') {
        // For Ethereum, we just clear the local state
        // The wallet extension handles its own connection state
        console.log("[BASE WALLET] Disconnecting Ethereum wallet");
        setEthereumDisconnected(true); // Prevent auto-reconnection
      }
      
      setIsConnected(false);
      setConnection(null);
      setSessionTopic(null);
      toast.success(`Disconnected from ${connection.type} wallet`);
    } catch (error) {
      console.error("[WALLET] Error disconnecting wallet:", error);
      toast.error("Error disconnecting wallet");
    }
  };

  return (
    <WalletContext.Provider
      value={{
        dAppConnector,
        isInitializing,
        isConnected,
        connection,
        connectWallet,
        getPublicKey,
        disconnectWallet,
        // Legacy compatibility
        accountId,
        publicKey,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

