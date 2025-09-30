"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DAppConnector } from "@hashgraph/hedera-wallet-connect";
import { LedgerId, AccountId } from "@hashgraph/sdk";
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

        // Create DAppConnector with proper configuration
        const connector = new DAppConnector(
          METADATA,
          network,
          PROJECT_ID
        );

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
                
                // Try to get public key from restored session
                try {
                  const signer = connector.getSigner(AccountId.fromString(accountIdString));
                  if (signer && signer.getAccountKey) {
                    const key = await signer.getAccountKey();
                    setPublicKey(key?.toString() || '');
                  }
                } catch (keyError) {
                  console.warn("[KEYRING WALLET] Could not restore public key:", keyError);
                }
                
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
      console.log("[KEYRING WALLET] Calling dAppConnector.openModal()");
      const session = await dAppConnector.openModal();
      console.log("[KEYRING WALLET] dAppConnector.openModal() returned", session);
      setSessionTopic(session.topic);

      // Extract account information from the session
      const namespace = Object.values(session.namespaces)[0];
      if (namespace?.accounts?.length) {
        // Extract accountId from "hedera:network:0.0.XXXXX" format
        const accountIdString = namespace.accounts[0].split(':')[2];
        setAccountId(accountIdString);
        setIsConnected(true);

        // Get the public key using API route (server-side)
        try {
          console.log("[KEYRING WALLET] Getting public key for account:", accountIdString);
          
          const response = await fetch('/api/get-public-key', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ accountId: accountIdString }),
          });
          
          const data = await response.json();
          
          if (data.success && data.publicKey) {
            setPublicKey(data.publicKey);
            console.log("[KEYRING WALLET] Public key obtained via API:", data.publicKey.substring(0, 20) + "...");
            
            toast.success(`Connected to KeyRing: ${accountIdString}`);
            return { 
              accountId: accountIdString, 
              publicKey: data.publicKey 
            };
          } else {
            throw new Error(data.error || 'Failed to get public key');
          }
        } catch (queryError) {
          console.error("[KEYRING WALLET] Failed to get public key:", queryError);
          toast.error("Failed to get public key from Hedera network");
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error("[KEYRING WALLET] Failed to connect wallet:", error);
      toast.error("Failed to connect to KeyRing wallet");
      return null;
    }
  };

  const getPublicKey = async (accountId: string): Promise<string | null> => {
    try {
      console.log("[KEYRING WALLET] Getting public key for account:", accountId);
      
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
        console.log("[KEYRING WALLET] Public key obtained via API:", data.publicKey.substring(0, 20) + "...");
        return data.publicKey;
      } else {
        throw new Error(data.error || 'Failed to get public key');
      }
    } catch (queryError) {
      console.error("[KEYRING WALLET] Failed to get public key:", queryError);
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
