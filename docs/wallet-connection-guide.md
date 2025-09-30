# Hedera Wallet Connection Implementation Guide

This guide provides a comprehensive analysis of the wallet connection implementation in the Lynx dApp, designed to help AI systems understand and replicate the successful patterns used for Hedera wallet integration.

## Overview

The Lynx dApp implements a robust wallet connection system using the official Hedera Wallet Connect SDK (`@hashgraph/hedera-wallet-connect`) with HashPack wallet integration. The implementation follows React patterns with context providers, custom hooks, and comprehensive error handling.

## Core Architecture

### 1. Package Dependencies

```json
{
  "dependencies": {
    "@hashgraph/hedera-wallet-connect": "^1.5.1",
    "@hashgraph/sdk": "^2.62.0",
    "@walletconnect/modal": "^2.7.0",
    "@walletconnect/sign-client": "^2.19.2",
    "@walletconnect/types": "^2.19.2"
  }
}
```

### 2. Environment Configuration

Required environment variables:

```env
# WalletConnect Project ID (get from https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Hedera Network Configuration
NEXT_PUBLIC_HEDERA_NETWORK=testnet  # or 'mainnet'

# Smart Contract Addresses
NEXT_PUBLIC_V2_LYNX_CONTRACT=0.0.XXXXXX
NEXT_PUBLIC_LYNX_CONTRACT_ID=0.0.XXXXXX

# Token Contract Addresses
NEXT_PUBLIC_SAUCE_TOKEN_ID=0.0.XXXXXX
NEXT_PUBLIC_WBTC_TOKEN_ID=0.0.XXXXXX
NEXT_PUBLIC_USDC_TOKEN_ID=0.0.XXXXXX
NEXT_PUBLIC_WETH_TOKEN_ID=0.0.XXXXXX
NEXT_PUBLIC_XSAUCE_TOKEN_ID=0.0.XXXXXX
```

## Implementation Patterns

### 1. Wallet Provider Pattern

The core wallet connection logic is implemented as a React Context Provider:

```typescript
// app/providers/WalletProvider.tsx
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
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextProps>({
  dAppConnector: null,
  isInitializing: false,
  isConnected: false,
  accountId: null,
  connectWallet: async () => null,
  disconnectWallet: async () => {},
});

export const useWallet = () => useContext(WalletContext);
```

### 2. Initialization Pattern

The wallet initialization follows a robust pattern with timeout handling and session restoration:

```typescript
const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
const METADATA = {
  name: "Lynx Token App",
  description: "Lynx Token App for interacting with Lynx token",
  url: typeof window !== "undefined" ? window.location.href : "",
  icons: ["https://app.lynxify.xyz/logo.png"],
};

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [dAppConnector, setDAppConnector] = useState<DAppConnector | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
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
            console.log("[WALLET] Session proposed");
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
                console.error("[WALLET] Error updating session:", error);
              }
            }
          });

          // Handle disconnection events
          connector.walletConnectClient.on("session_delete", ({ topic }) => {
            if (topic === sessionTopic) {
              setIsConnected(false);
              setAccountId(null);
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
                toast.success(`Reconnected to account: ${accountIdString}`);
              }
            } catch (error) {
              console.error("[WALLET] Error restoring session:", error);
            }
          }
        }
      } catch (error) {
        console.error("[WALLET] Failed to initialize wallet connect:", error);
        toast.error("Failed to initialize wallet");
      } finally {
        setIsInitializing(false);
      }
    };

    initWalletConnect();
  }, [sessionTopic]);
```

### 3. Connection Pattern

The wallet connection process uses the `openModal()` method:

```typescript
const connectWallet = async (): Promise<string | null> => {
  if (!dAppConnector) {
    console.error("[WALLET] Wallet connector not initialized");
    toast.error("Wallet not initialized");
    return null;
  }

  try {
    console.log("[WALLET] Starting wallet connection process");

    // This opens the HashPack popup
    const session = await dAppConnector.openModal();
    setSessionTopic(session.topic);

    // Extract account information from the session
    const namespace = Object.values(session.namespaces)[0];
    if (namespace?.accounts?.length) {
      // Extract accountId from "hedera:mainnet:0.0.XXXXX" format
      const accountIdString = namespace.accounts[0].split(':')[2];
      setAccountId(accountIdString);
      setIsConnected(true);

      // Test signer availability
      try {
        const signer = dAppConnector.getSigner(AccountId.fromString(accountIdString));
        console.log("[WALLET] Signer obtained:", {
          hasSigner: !!signer,
          canSignTransaction: typeof signer.signTransaction === 'function'
        });
      } catch (signerError) {
        console.error("[WALLET] Failed to test signer:", signerError);
      }

      toast.success(`Connected to account: ${accountIdString}`);
      return accountIdString;
    }
    return null;
  } catch (error) {
    console.error("[WALLET] Failed to connect wallet:", error);
    toast.error("Failed to connect wallet");
    return null;
  }
};
```

### 4. Transaction Signing Pattern

The dApp uses a consistent pattern for signing transactions:

```typescript
// Transaction execution pattern
const executeTransaction = async (
  transaction: string,
  accountId: string,
  connector: DAppConnector,
  description: string = 'Transaction'
): Promise<{ success: boolean; txId?: string; error?: string }> => {
  try {
    console.log(`[UTILS] Executing ${description} for account ${accountId}`);

    const response = await connector.signAndExecuteTransaction({
      signerAccountId: accountId,
      transactionList: transaction
    });

    console.log(`[UTILS] ${description} executed successfully:`, response);
    
    return {
      success: true,
      txId: String(response?.id || 'unknown')
    };

  } catch (error) {
    console.error(`[UTILS] Error executing ${description}:`, error);
    
    // Handle empty error objects (wallet popup closed)
    if (error && typeof error === 'object' && Object.keys(error).length === 0) {
      return {
        success: false,
        error: 'Transaction was rejected or wallet popup was closed'
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
```

### 5. Transaction Creation Pattern

Transactions are created using the Hedera SDK and converted to base64:

```typescript
// Example: Token approval transaction
const transaction = new AccountAllowanceApproveTransaction()
  .approveTokenAllowance(
    TokenId.fromString(tokenId),
    AccountId.fromString(this.accountId),
    AccountId.fromString(depositMinterHederaId),
    Number(amount)
  )
  .setTransactionId(TransactionId.generate(sender))
  .setTransactionMemo(`Approve ${tokenName} for LYNX Minting`)
  .setMaxTransactionFee(new Hbar(2))
  .freezeWith(client);

// Convert to base64 using SDK method
const txBase64 = transactionToBase64String(transaction);

// Execute through wallet
const response = await this.connector.signAndExecuteTransaction({
  signerAccountId: this.accountId,
  transactionList: txBase64
});
```

### 6. Custom Hook Pattern

A custom hook provides a clean interface for components:

```typescript
// app/hooks/useWallet.ts
export interface UseWalletResult {
  connector: DAppConnector | null;
  account: WalletAccount | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  error: Error | null;
}

export function useWallet(): UseWalletResult {
  const { 
    dAppConnector, 
    isInitializing, 
    isConnected, 
    accountId, 
    connectWallet, 
    disconnectWallet 
  } = useWalletProvider();

  // Map status from context properties
  let status: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  if (isInitializing) {
    status = 'connecting';
  } else if (isConnected) {
    status = 'connected';
  }

  // Create account object
  const account: WalletAccount | null = accountId ? {
    accountId,
    network: 'testnet'
  } : null;

  // Wrap functions to return booleans
  const connect = async (): Promise<boolean> => {
    try {
      await connectWallet();
      return true;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return false;
    }
  };

  const disconnect = async (): Promise<boolean> => {
    try {
      await disconnectWallet();
      return true;
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      return false;
    }
  };

  return {
    connector: dAppConnector,
    account,
    status,
    isConnected,
    isConnecting: isInitializing,
    connect,
    disconnect,
    error: null
  };
}
```

### 7. UI Component Pattern

The wallet connection UI follows a state-based rendering pattern:

```typescript
// app/components/ConnectWallet.tsx
const ConnectWallet: React.FC = () => {
  const { isConnected, accountId, connectWallet, disconnectWallet, isInitializing } = useWallet();

  if (isInitializing) {
    return (
      <Button isLoading variant="bordered" size="sm">
        Initializing
      </Button>
    );
  }

  if (isConnected && accountId) {
    return (
      <Button onClick={disconnectWallet} variant="bordered" size="sm">
        {accountId.length > 12 
          ? `${accountId.substring(0, 6)}...${accountId.substring(accountId.length - 6)}` 
          : accountId
        }
      </Button>
    );
  }

  return (
    <Button onClick={connectWallet} variant="bordered" size="sm">
      Connect Wallet
    </Button>
  );
};
```

## Key Success Patterns

### 1. Session Persistence
- The implementation automatically restores wallet sessions on page reload
- Uses WalletConnect's built-in session management
- Handles session expiration and deletion gracefully

### 2. Error Handling
- Comprehensive error logging with structured console output
- Graceful handling of empty error objects (wallet popup closed)
- User-friendly toast notifications for all states

### 3. Network Configuration
- Environment-based network selection (testnet/mainnet)
- Proper LedgerId configuration for Hedera SDK
- Dynamic contract address resolution

### 4. Transaction Management
- Consistent transaction creation using Hedera SDK
- Proper transaction freezing before signing
- Base64 encoding using SDK methods only
- Comprehensive transaction response handling

### 5. State Management
- React Context for global wallet state
- Custom hooks for component-level access
- Proper TypeScript typing throughout
- Ref-based initialization guards

## Critical Button Click to Wallet Connection Flow

**THIS IS THE MOST IMPORTANT SECTION** - The exact step-by-step flow that happens when a user clicks the "Connect Wallet" button:

### Step 1: Button Click Event
```typescript
// In ConnectWallet.tsx component
<Button onClick={connectWallet}>Connect Wallet</Button>
```

### Step 2: Function Call Chain
```typescript
// 1. Button click triggers connectWallet from useWallet hook
const { connectWallet } = useWallet();

// 2. useWallet hook calls the connectWallet from WalletProvider context
const connectWallet = async (): Promise<string | null> => {
  // This function is defined in WalletProvider.tsx
}
```

### Step 3: Critical Prerequisites Check
```typescript
// BEFORE anything else, check if dAppConnector is initialized
if (!dAppConnector) {
  console.error("[WALLET] Wallet connector not initialized");
  toast.error("Wallet not initialized");
  return null;
}
```

### Step 4: The Magic Call - dAppConnector.openModal()
```typescript
// THIS IS THE CRITICAL LINE THAT OPENS THE WALLET POPUP
console.log("[WALLET] Calling dAppConnector.openModal()");
const session = await dAppConnector.openModal();
```

**What happens here:**
- `dAppConnector.openModal()` is called
- This triggers WalletConnect protocol
- HashPack wallet opens automatically (if installed)
- User approves connection in HashPack wallet
- Session object is returned with account information

### Step 5: Session Processing
```typescript
// Extract session topic
setSessionTopic(session.topic);

// Extract account information from session namespaces
const namespace = Object.values(session.namespaces)[0];
if (namespace?.accounts?.length) {
  // Parse account ID from "hedera:testnet:0.0.XXXXX" format
  const accountIdString = namespace.accounts[0].split(':')[2];
  setAccountId(accountIdString);
  setIsConnected(true);
}
```

### Step 6: Signer Verification
```typescript
// Test that we can get a signer for transactions
try {
  const signer = dAppConnector.getSigner(AccountId.fromString(accountIdString));
  console.log("[WALLET] Signer obtained:", {
    hasSigner: !!signer,
    canSignTransaction: typeof signer.signTransaction === 'function'
  });
} catch (signerError) {
  console.error("[WALLET] Failed to test signer:", signerError);
}
```

### Common Mistakes AI Systems Make:

1. **Missing dAppConnector Initialization**: The `dAppConnector` must be fully initialized before calling `openModal()`
2. **Wrong Function Call**: Must call `dAppConnector.openModal()`, not `dAppConnector.connect()` or similar
3. **Missing Error Handling**: The `openModal()` call can fail if wallet is not installed or user rejects
4. **Session Parsing**: Must correctly parse the session namespace to extract account ID
5. **State Updates**: Must update all state variables (isConnected, accountId, sessionTopic)

### Complete Working Example:

```typescript
// This is the EXACT function that works in the Lynx dApp
const connectWallet = async (): Promise<string | null> => {
  // Step 1: Check if connector is ready
  if (!dAppConnector) {
    console.error("[WALLET] Wallet connector not initialized");
    toast.error("Wallet not initialized");
    return null;
  }
  
  try {
    console.log("[WALLET] Starting wallet connection process");
    
    // Step 2: Log connector state for debugging
    console.log("[WALLET] Connector state before connection:", {
      isInitialized: !!dAppConnector,
      hasWalletConnectClient: !!dAppConnector?.walletConnectClient,
      existingSessions: dAppConnector.walletConnectClient?.session?.getAll()?.length || 0,
      methods: Object.getOwnPropertyNames(dAppConnector)
    });
    
    // Step 3: THE CRITICAL CALL - This opens HashPack popup
    console.log("[WALLET] Calling dAppConnector.openModal()");
    const session = await dAppConnector.openModal();
    console.log("[WALLET] dAppConnector.openModal() returned", session);
    
    // Step 4: Process the returned session
    setSessionTopic(session.topic);
    
    console.log("[WALLET] Session established:", {
      topic: session.topic,
      expiry: session.expiry,
      namespaces: Object.keys(session.namespaces),
      hederaNamespace: !!session.namespaces.hedera
    });
    
    // Step 5: Extract account information
    try {
      const namespace = Object.values(session.namespaces)[0];
      console.log("[WALLET] Session namespace:", namespace);
      
      if (namespace?.accounts?.length) {
        // Extract accountId from "hedera:mainnet:0.0.XXXXX" or "hedera:testnet:0.0.XXXXX" format
        const accountIdString = namespace.accounts[0].split(':')[2];
        console.log("[WALLET] Connected account ID:", accountIdString);
        
        setAccountId(accountIdString);
        setIsConnected(true);
        
        // Step 6: Test signer availability
        try {
          console.log("[WALLET] Testing signer with accountId:", accountIdString);
          const signer = dAppConnector.getSigner(AccountId.fromString(accountIdString));
          
          console.log("[WALLET] New connection signer obtained:", {
            hasSigner: !!signer,
            signerType: typeof signer,
            canSignTransaction: typeof signer.signTransaction === 'function',
            signerMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(signer || {}))
          });
          
          // Store account ID for reconnection
          localStorage.setItem('walletAccountId', accountIdString);
        } catch (signerError) {
          console.error("[WALLET] Failed to test signer after connection:", signerError);
        }
        
        toast.success(`Connected to account: ${accountIdString}`);
        return accountIdString;
      } else {
        console.error("[WALLET] No accounts found in session namespace");
        return null;
      }
    } catch (error) {
      console.error("[WALLET] Error extracting account ID from session:", error);
      toast.error("Failed to get account information");
      return null;
    }
  } catch (error) {
    console.error("[WALLET] Failed to connect wallet:", error);
    toast.error("Failed to connect wallet");
    return null;
  }
};
```

## Integration Steps

To implement this pattern in another dApp:

1. **Install Dependencies**:
   ```bash
   npm install @hashgraph/hedera-wallet-connect @hashgraph/sdk
   ```

2. **Set up Environment Variables**:
   - Get WalletConnect Project ID from https://cloud.walletconnect.com/
   - Configure Hedera network and contract addresses

3. **Implement Wallet Provider**:
   - Copy the WalletProvider pattern
   - Adapt metadata for your dApp
   - Configure network settings

4. **Create Custom Hook**:
   - Implement useWallet hook
   - Adapt interface for your needs

5. **Build UI Components**:
   - Create connection button component
   - Implement state-based rendering
   - Add loading and error states

6. **Implement Transaction Services**:
   - Create service classes for different transaction types
   - Use consistent transaction creation patterns
   - Implement proper error handling

7. **Add to App Layout**:
   - Wrap app with WalletProvider
   - Ensure proper provider hierarchy

## Testing Considerations

The implementation includes comprehensive testing patterns:

- Mock implementations for testing environments
- Jest configuration for unit tests
- Integration test patterns for wallet interactions
- Error scenario testing

## Security Considerations

- No private keys stored in frontend
- All transactions signed by user's wallet
- Proper session management
- Environment variable protection
- Transaction validation before execution

This implementation provides a robust, production-ready wallet connection system for Hedera dApps that can be successfully replicated in other projects.
