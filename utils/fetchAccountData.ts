/**
 * Utility to fetch real account data from Hedera Mirror Node
 */

const MIRROR_NODE_BASE_URL = 'https://testnet.mirrornode.hedera.com/api/v1';

export interface AccountData {
  accountId: string;
  createdTimestamp: string;
  balance: number;
  transactionCount: number;
  contractInteractions: number;
  memo?: string;
}

export interface TransactionData {
  transactionId: string;
  consensusTimestamp: string;
  type: string;
  result: string;
  charged_tx_fee: number;
}

/**
 * Fetch account information from Mirror Node
 */
export async function fetchAccountInfo(accountId: string): Promise<AccountData | null> {
  try {
    console.log(`[Mirror Node] Fetching account info for: ${accountId}`);
    
    const response = await fetch(`${MIRROR_NODE_BASE_URL}/accounts/${accountId}`);
    
    if (!response.ok) {
      console.error(`[Mirror Node] Account info request failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json() as any;
    
    // Convert Hedera timestamp to ISO string
    const createdTimestamp = data.created_timestamp 
      ? new Date(parseFloat(data.created_timestamp) * 1000).toISOString()
      : new Date().toISOString();
    
    // Count transactions and contract interactions from the account data
    const transactions = data.transactions || [];
    const contractInteractions = transactions.filter((tx: any) => 
      tx.name === 'CONTRACTCALL' || tx.name === 'CONTRACTCREATEINSTANCE'
    ).length;
    
    return {
      accountId: data.account,
      createdTimestamp,
      balance: data.balance?.balance || 0,
      transactionCount: transactions.length,
      contractInteractions,
      memo: data.memo
    };
    
  } catch (error) {
    console.error(`[Mirror Node] Error fetching account info for ${accountId}:`, error);
    return null;
  }
}

/**
 * Format transaction data from account info response
 */
export function formatAccountTransactions(transactions: any[]): {
  totalCount: number;
  contractInteractions: number;
  transactions: TransactionData[];
} {
  if (!transactions || transactions.length === 0) {
    return { totalCount: 0, contractInteractions: 0, transactions: [] };
  }

  // Count contract interactions (contract call/create transactions)
  const contractInteractions = transactions.filter((tx: any) => 
    tx.name === 'CONTRACTCALL' || tx.name === 'CONTRACTCREATEINSTANCE'
  ).length;

  const formattedTransactions: TransactionData[] = transactions.slice(0, 10).map((tx: any) => ({
    transactionId: tx.transaction_id,
    consensusTimestamp: tx.consensus_timestamp,
    type: tx.name || 'UNKNOWN',
    result: tx.result || 'UNKNOWN',
    charged_tx_fee: tx.charged_tx_fee || 0
  }));

  return {
    totalCount: transactions.length,
    contractInteractions,
    transactions: formattedTransactions
  };
}

/**
 * Get comprehensive account data including transactions
 */
export async function getComprehensiveAccountData(accountId: string): Promise<{
  accountInfo: AccountData | null;
  transactionData: {
    totalCount: number;
    contractInteractions: number;
    transactions: TransactionData[];
  };
}> {
  try {
    console.log(`[Mirror Node] Fetching comprehensive data for: ${accountId}`);
    
    const response = await fetch(`${MIRROR_NODE_BASE_URL}/accounts/${accountId}`);
    
    if (!response.ok) {
      console.error(`[Mirror Node] Account request failed: ${response.status}`);
      return {
        accountInfo: null,
        transactionData: { totalCount: 0, contractInteractions: 0, transactions: [] }
      };
    }
    
    const data = await response.json() as any;
    
    // Convert Hedera timestamp to ISO string
    const createdTimestamp = data.created_timestamp 
      ? new Date(parseFloat(data.created_timestamp) * 1000).toISOString()
      : new Date().toISOString();
    
    // Process transactions from account data
    const transactions = data.transactions || [];
    const transactionData = formatAccountTransactions(transactions);
    
    const accountInfo: AccountData = {
      accountId: data.account,
      createdTimestamp,
      balance: data.balance?.balance || 0,
      transactionCount: transactionData.totalCount,
      contractInteractions: transactionData.contractInteractions,
      memo: data.memo
    };
    
    return {
      accountInfo,
      transactionData
    };
    
  } catch (error) {
    console.error(`[Mirror Node] Error fetching comprehensive data for ${accountId}:`, error);
    return {
      accountInfo: null,
      transactionData: { totalCount: 0, contractInteractions: 0, transactions: [] }
    };
  }
}
