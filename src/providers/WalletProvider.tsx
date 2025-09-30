"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DAppConnector } from "@hashgraph/hedera-wallet-connect";
import { LedgerId } from "@hashgraph/sdk";
import { toast } from "sonner";

interface WalletContextProps {
  dAppConnector: DAppConnector | null;
  isInitializing: boolean;
  isConnected: boolean;
  accountId: string | null;
  publicKey: string | null;
  connectWallet: () => Promise<{ accountId: string; publicKey: string } | null>;
  getPublicKey: (accountId: string) => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextProps>({
  dAppConnector: null,
  isInitializing: false,
  isConnected: false,
  accountId: null,
  publicKey: null,
  connectWallet: async () => null,
  getPublicKey: async () => null,
  disconnectWallet: async () => {},
});

export const useWallet = () => useContext(WalletContext);

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
const METADATA = {
  name: "KeyRing Protocol",
  description: "KeyRing Protocol - Hedera Trust Layer for Threshold Keys",
  url: typeof window !== "undefined" ? window.location.href : "",
  icons: ["/keyring-logo.png"],
};

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [dAppConnector, setDAppConnector] = useState<DAppConnector | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [sessionTopic, setSessionTopic] = useState<string | null>(null);
  const initialized = React.useRef(false);

  useEffect(() => {
    const initWalletConnect = async () => {
      if (initialized.current) return;
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
                  setAccountId(accountIdString);
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
              setAccountId(null);
              setPublicKey(null);
              setSessionTopic(null);
            }
          });

          // Try to restore existing session
          const sessions = connector.walletConnectClient.session.getAll();
          if (sessions.length > 0) {
            const latestSession = sessions[sessions.length - 1];
            setSessionTopic(latestSession.topic);

            try {
              const namespace = Object.values(latestSession.namespaces)[0];
              if (namespace?.accounts?.length) {
                const accountIdString = namespace.accounts[0].split(':')[2];
                setAccountId(accountIdString);
                setIsConnected(true);
                
                console.log("[KEYRING WALLET] Session restored for account:", accountIdString);
                toast.success(`Reconnected to KeyRing: ${accountIdString}`);
              }
            } catch (error) {
              console.error("[KEYRING WALLET] Error restoring session:", error);
            }
          }
        }
      } catch (error) {
        console.error("[KEYRING WALLET] Failed to initialize wallet connect:", error);
        toast.error("Failed to initialize KeyRing wallet");
      } finally {
        setIsInitializing(false);
      }
    };

    initWalletConnect();
  }, [sessionTopic]);

  const connectWallet = async (): Promise<{ accountId: string; publicKey: string } | null> => {
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
        
        setAccountId(accountIdString);
        setIsConnected(true);

        console.log("[KEYRING WALLET] Wallet connected successfully:", accountIdString);
        toast.success(`Connected to KeyRing: ${accountIdString}`);
        
        return { 
          accountId: accountIdString, 
          publicKey: '' // Public key will be fetched when creating profile
        };
      }
      return null;
    } catch (error) {
      console.error("[KEYRING WALLET] Failed to connect wallet:", error);
      toast.error("Failed to connect to KeyRing wallet");
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
        setPublicKey(data.publicKey);
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
    if (!dAppConnector || !sessionTopic) {
      console.log("[KEYRING WALLET] No active session to disconnect");
      return;
    }

    try {
      await dAppConnector.disconnectAll();
      setIsConnected(false);
      setAccountId(null);
      setPublicKey(null);
      setSessionTopic(null);
      toast.success("Disconnected from KeyRing wallet");
    } catch (error) {
      console.error("[KEYRING WALLET] Error disconnecting wallet:", error);
      toast.error("Error disconnecting wallet");
    }
  };

  return (
    <WalletContext.Provider
      value={{
        dAppConnector,
        isInitializing,
        isConnected,
        accountId,
        publicKey,
        connectWallet,
        getPublicKey,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
