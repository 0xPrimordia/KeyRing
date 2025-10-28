'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Buffer } from 'buffer';
import Header from '../../components/Header';
import { useWallet } from '../../providers/WalletProvider';
import { 
  ScheduleSignTransaction, 
  ScheduleId,
  AccountId,
  TransactionId,
  Client
} from '@hashgraph/sdk';

interface PendingSchedule {
  schedule_id: string;
  creator_account_id: string;
  payer_account_id: string;
  memo: string;
  consensus_timestamp: string;
  expiration_time: string;
  executed_timestamp: string | null;
  deleted: boolean;
  signatures: any[];
  transaction_body?: any;
}

interface AccountMetadata {
  publicKey: string;
  thresholdLists: {
    accountId: string;
    memo: string;
    keyType: string;
    createdAt: string;
  }[];
  recentTransactions: {
    transaction_id: string;
    name: string;
    consensus_timestamp: string;
    result: string;
    memo: string;
  }[];
}

export default function SignerDashboard() {
  const router = useRouter();
  const { isConnected, connection, connectWallet: connectWalletProvider, dAppConnector } = useWallet();
  const [pendingSchedules, setPendingSchedules] = useState<PendingSchedule[]>([]);
  const [accountMetadata, setAccountMetadata] = useState<AccountMetadata | null>(null);
  const [rewardBalance, setRewardBalance] = useState<{
    total: number;
    pending: number;
    paid: number;
  }>({ total: 0, pending: 0, paid: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [collapsedLists, setCollapsedLists] = useState<Set<string>>(new Set());
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [demoGenerationStep, setDemoGenerationStep] = useState<string>('');

  // Get account ID from connection
  const accountId = connection?.type === 'hedera' ? connection.accountId : null;
  
  // Debug wallet state
  useEffect(() => {
    console.log('Dashboard wallet state:', { 
      isConnected, 
      connection: JSON.stringify(connection), 
      accountId,
      connectionType: connection?.type 
    });
  }, [isConnected, connection, accountId]);

  // Load pending schedules and metadata when wallet connects
  useEffect(() => {
    if (accountId) {
      loadAccountMetadata();
      loadPendingSchedules();
      loadRewardBalance();
    }
  }, [accountId]);

  async function connectWallet() {
    try {
      setLoading(true);
      setError(null);
      await connectWalletProvider('hedera');
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }

  async function loadAccountMetadata() {
    if (!accountId) return;

    try {
      console.log('[DASHBOARD] Loading account metadata for:', accountId);

      // Fetch account info from Mirror Node
      const accountResponse = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
      );

      if (!accountResponse.ok) {
        throw new Error('Failed to load account info');
      }

      const accountData = await accountResponse.json();
      
      // Extract public key
      const publicKey = accountData.key?._type === 'ED25519' 
        ? accountData.key.key 
        : 'Unknown';

      // Fetch recent transactions to find threshold list participation
      const txResponse = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/transactions?account.id=${accountId}&limit=20&order=desc`
      );

      const txData = await txResponse.json();
      const transactions = txData.transactions || [];

      // Extract recent SCHEDULESIGN transactions
      const recentTransactions = transactions
        .filter((tx: any) => ['SCHEDULESIGN', 'CRYPTOTRANSFER', 'CRYPTOCREATEACCOUNT'].includes(tx.name))
        .slice(0, 10)
        .map((tx: any) => ({
          transaction_id: tx.transaction_id,
          name: tx.name,
          consensus_timestamp: new Date(parseFloat(tx.consensus_timestamp) * 1000).toLocaleString(),
          result: tx.result,
          memo: tx.memo_base64 ? Buffer.from(tx.memo_base64, 'base64').toString('utf-8') : ''
        }));

      // TODO: Discover threshold lists this account is part of
      // This requires either:
      // 1. Off-chain tracking/registry
      // 2. Scanning account creation events for KeyLists containing this public key
      // 3. Project-maintained metadata
      const thresholdLists = [
        {
          accountId: '0.0.7102741',
          memo: 'KeyRing Protocol KeyList Test Account',
          keyType: '2-of-3 Threshold',
          createdAt: 'Oct 21, 2025'
        }
      ];

      setAccountMetadata({
        publicKey,
        thresholdLists,
        recentTransactions
      });

      console.log('[DASHBOARD] Account metadata loaded:', { publicKey, thresholdLists: thresholdLists.length, transactions: recentTransactions.length });

    } catch (err: any) {
      console.error('Error loading account metadata:', err);
      // Don't show error to user for metadata - it's supplementary info
    }
  }

  function getRiskLevelFromMemo(memo: string): { level: 'low' | 'medium' | 'high' | 'critical'; label: string } | null {
    const memoLower = memo?.toLowerCase() || '';
    
    if (!memoLower.includes('boostproject:')) {
      return null;
    }

    const txTypeMatch = memoLower.match(/boostproject:\s*(\w+)/);
    if (!txTypeMatch) return null;
    
    const txType = txTypeMatch[1].toUpperCase();
    
    if (txType === 'SIMPLE_BOOST') {
      return { level: 'low', label: 'LOW RISK' };
    } else if (txType === 'TOKEN_PAUSE' || txType === 'SUPPLY_KEY_TRANSFER') {
      return { level: 'critical', label: 'CRITICAL' };
    } else if (txType === 'TOKEN_MINT' || txType === 'TOKEN_BURN' || txType === 'TREASURY_TRANSFER') {
      return { level: 'high', label: 'HIGH RISK' };
    } else if (txType === 'ACCOUNT_ALLOWANCE' || txType === 'FEE_SCHEDULE_UPDATE') {
      return { level: 'medium', label: 'MEDIUM RISK' };
    }
    
    return { level: 'medium', label: 'REVIEW' };
  }

  function toggleThresholdList(listId: string) {
    setCollapsedLists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listId)) {
        newSet.delete(listId);
      } else {
        newSet.add(listId);
      }
      return newSet;
    });
  }

  // Group schedules by payer_account_id (threshold list)
  const schedulesByThresholdList = pendingSchedules.reduce((acc, schedule) => {
    const thresholdList = schedule.payer_account_id;
    if (!acc[thresholdList]) {
      acc[thresholdList] = [];
    }
    acc[thresholdList].push(schedule);
    return acc;
  }, {} as Record<string, PendingSchedule[]>);

  async function loadRewardBalance() {
    if (!accountId) return;

    try {
      console.log('[DASHBOARD] Loading reward balance for:', accountId);

      const response = await fetch(`/api/signers/${accountId}/rewards`);
      
      if (!response.ok) {
        console.warn('[DASHBOARD] Could not load rewards, showing zero balance');
        setRewardBalance({ total: 0, pending: 0, paid: 0 });
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        const rewards = data.rewards || [];
        const total = rewards.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);
        const pending = rewards
          .filter((r: any) => r.status === 'pending')
          .reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);
        const paid = rewards
          .filter((r: any) => r.status === 'paid')
          .reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);

        setRewardBalance({ total, pending, paid });
        console.log('[DASHBOARD] Reward balance loaded:', { total, pending, paid });
      } else {
        // Show zero balance if API fails
        setRewardBalance({ total: 0, pending: 0, paid: 0 });
      }
    } catch (err: any) {
      console.error('Error loading reward balance:', err);
      // Show zero balance on error
      setRewardBalance({ total: 0, pending: 0, paid: 0 });
    }
  }

  async function generateDemoList() {
    if (!accountId) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setGeneratingDemo(true);
      setError(null);

      console.log('[DEMO] Starting demo generation for:', accountId);
      setDemoGenerationStep('Creating threshold list...');

      const response = await fetch('/api/generate-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectedAccountId: accountId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to generate demo');
      }

      console.log('[DEMO] Generation complete:', data);
      setDemoGenerationStep('Demo created successfully!');

      // Reload pending schedules to show the new transactions
      setTimeout(() => {
        loadPendingSchedules();
        setGeneratingDemo(false);
        setDemoGenerationStep('');
      }, 2000);

    } catch (err: any) {
      console.error('[DEMO] Error generating demo:', err);
      setError(err.message || 'Failed to generate demo list');
      setGeneratingDemo(false);
      setDemoGenerationStep('');
    }
  }

  async function loadPendingSchedules() {
    if (!accountId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('[DASHBOARD] Loading pending schedules for account:', accountId);

      // Get my public key first
      const myAccountResponse = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
      );
      const myAccountData = await myAccountResponse.json();
      const myPublicKey = myAccountData.key?._type === 'ED25519' ? myAccountData.key.key : null;

      if (!myPublicKey) {
        console.error('[DASHBOARD] Could not retrieve public key');
        setError('Could not retrieve account public key');
        return;
      }

      console.log('[DASHBOARD] My public key:', myPublicKey);

      // List of known project operator accounts to query
      // TODO: This could come from a config or database in production
      const projectOperators = [
        '0.0.4337514', // Main test operator
        // Add more project operators as needed
      ];

      const allPendingSchedules: PendingSchedule[] = [];

      // Query schedules created by each project operator
      for (const operatorId of projectOperators) {
        console.log('[DASHBOARD] Querying schedules from operator:', operatorId);
        
        const response = await fetch(
          `https://testnet.mirrornode.hedera.com/api/v1/schedules?account.id=${operatorId}&order=desc&limit=50`
        );

        if (!response.ok) continue;

      const data = await response.json();
        const schedules = data.schedules || [];

        console.log(`[DASHBOARD] Found ${schedules.length} schedules from ${operatorId}`);

        // Filter and check each schedule
        for (const schedule of schedules) {
          // Skip executed or deleted schedules
          if (schedule.executed_timestamp || schedule.deleted) {
            continue;
          }

          // Decode transaction body to find involved accounts
          try {
            const txBodyBase64 = schedule.transaction_body;
            const txBodyBytes = Buffer.from(txBodyBase64, 'base64');
            const txBodyHex = txBodyBytes.toString('hex');

            // Helper function to decode protobuf varint
            const decodeVarint = (bytes: number[]): number => {
              let result = 0;
              let shift = 0;
              for (const byte of bytes) {
                result |= (byte & 0x7f) << shift;
                if ((byte & 0x80) === 0) break;
                shift += 7;
              }
              return result;
            };

            // Look for account IDs in the transaction body
            // Account numbers are after 0x18 (field 3, varint) in protobuf
            const accountsInTx: string[] = [];
            for (let i = 0; i < txBodyHex.length - 2; i += 2) {
              if (txBodyHex.slice(i, i + 2) === '18') {
                // Found a field 3 (likely accountNum)
                // Read the varint that follows
                const varintBytes: number[] = [];
                let offset = i + 2;
                while (offset < txBodyHex.length) {
                  const byte = parseInt(txBodyHex.slice(offset, offset + 2), 16);
                  varintBytes.push(byte);
                  offset += 2;
                  if ((byte & 0x80) === 0) break; // Last byte of varint
                  if (varintBytes.length > 10) break; // Safety limit
                }
                if (varintBytes.length > 0) {
                  const accountNum = decodeVarint(varintBytes);
                  if (accountNum > 0 && accountNum < 100000000) { // Reasonable range
                    accountsInTx.push(`0.0.${accountNum}`);
                  }
                }
              }
            }

            // Also check payer account - important for contract calls where payer is threshold list
            if (schedule.payer_account_id && !accountsInTx.includes(schedule.payer_account_id)) {
              accountsInTx.push(schedule.payer_account_id);
            }

            console.log('[DASHBOARD] Schedule', schedule.schedule_id, 'involves accounts:', accountsInTx);

            // For each account in the transaction, check if it's a threshold list containing my key
            let requiresMySignature = false;

            for (const acctId of accountsInTx) {
              // Fetch account to check if it has a KeyList
              try {
                const acctResponse = await fetch(
                  `https://testnet.mirrornode.hedera.com/api/v1/accounts/${acctId}`
                );
                
                if (!acctResponse.ok) continue;

                const acctData = await acctResponse.json();
                const key = acctData.key;

                // Check if this is a KeyList (ProtobufEncoded)
                if (key?._type === 'ProtobufEncoded' && key.key) {
                  const keyHex = key.key;
                  
                  // Check if my public key is in this KeyList
                  if (keyHex.includes(myPublicKey)) {
                    console.log('[DASHBOARD] Found my key in threshold list:', acctId);
                    
                    // Check if I've already signed this schedule
                    const mySignature = schedule.signatures?.find((sig: any) => {
                      // Compare public key prefix (base64 encoded)
                      const sigKeyHex = Buffer.from(sig.public_key_prefix, 'base64').toString('hex');
                      return myPublicKey.includes(sigKeyHex) || sigKeyHex.includes(myPublicKey.slice(0, 40));
                    });

                    if (!mySignature) {
                      requiresMySignature = true;
                      console.log('[DASHBOARD] Schedule requires my signature:', schedule.schedule_id);
                      break;
                    } else {
                      console.log('[DASHBOARD] Already signed schedule:', schedule.schedule_id);
                    }
                  }
                }
              } catch (err) {
                console.error(`[DASHBOARD] Error checking account ${acctId}:`, err);
              }
            }

            if (requiresMySignature) {
              allPendingSchedules.push(schedule);
            }

          } catch (err) {
            console.error('[DASHBOARD] Error processing schedule:', schedule.schedule_id, err);
          }
        }
      }

      console.log('[DASHBOARD] Total pending schedules requiring my signature:', allPendingSchedules.length);
      setPendingSchedules(allPendingSchedules);

    } catch (err: any) {
      console.error('Error loading schedules:', err);
      setError(err.message || 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }

  async function approveSchedule(scheduleId: string) {
    if (!accountId || !dAppConnector) {
      setError('Wallet not connected');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`[SIGNER] Approving schedule ${scheduleId} with account ${accountId}`);

      // First, get detailed schedule information to check signatures
      const scheduleResponse = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/schedules/${scheduleId}`
      );
      
      if (!scheduleResponse.ok) {
        throw new Error('Failed to fetch schedule details');
      }

      const scheduleData = await scheduleResponse.json();
      console.log('[SIGNER] Schedule details:', {
        scheduleId,
        signatures: scheduleData.signatures,
        executed: scheduleData.executed_timestamp,
        deleted: scheduleData.deleted
      });

      // Check if already signed
      if (scheduleData.signatures) {
        const alreadySigned = scheduleData.signatures.some((sig: any) => {
          // Signatures might have account_id or consensus_timestamp
          console.log('[SIGNER] Checking signature:', sig);
          return sig.account_id === accountId;
        });

        if (alreadySigned) {
          setError(`You have already signed this schedule`);
          return;
        }
      }

      // Get the signer from the wallet connection
      const signer = dAppConnector.getSigner(AccountId.fromString(accountId));
      
      console.log('[SIGNER] Got signer from wallet:', {
        hasSigner: !!signer,
        accountId
      });

      // Get the schedule memo to include in the sign transaction
      const scheduleMemo = scheduleData.memo || 'Sign Scheduled Transaction';

      // Create the schedule sign transaction with context
      const transaction = await new ScheduleSignTransaction()
        .setScheduleId(ScheduleId.fromString(scheduleId))
        .setTransactionMemo(`Approving: ${scheduleMemo}`)
        .freezeWithSigner(signer);

      console.log('[SIGNER] Transaction frozen with signer, executing...', {
        scheduleId,
        memo: scheduleMemo
      });

      // Execute the transaction with the signer
      const response = await transaction.executeWithSigner(signer);

      console.log('[SIGNER] Schedule signed successfully:', response);
      
      // Extract transaction ID from response
      const signTransactionId = response?.transactionId?.toString() || null;
      
      // Record the reward for signing
      if (signTransactionId) {
        try {
          const rewardResponse = await fetch('/api/rewards/record-signature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId,
              scheduleId,
              transactionId: signTransactionId
            })
          });

          const rewardData = await rewardResponse.json();
          
          if (rewardData.success) {
            console.log('[SIGNER] Reward recorded:', rewardData.reward);
            // Reload reward balance to show updated amount
            await loadRewardBalance();
            // Show success message with reward info
            setError(null);
          } else {
            console.warn('[SIGNER] Could not record reward:', rewardData.error);
            // Still consider the signature successful even if reward recording fails
            setError(null);
          }
        } catch (rewardErr) {
          console.error('[SIGNER] Error recording reward:', rewardErr);
          // Don't fail the whole operation if reward recording fails
          setError(null);
        }
      }
      
      // Reload schedules to see updated status
      await loadPendingSchedules();

    } catch (err: any) {
      console.error('[SIGNER] Error signing schedule:', err);
      
      // Parse the error if it's a JSON string
      let errorMessage = 'Failed to sign schedule';
      if (typeof err === 'string') {
        try {
          const errorObj = JSON.parse(err);
          if (errorObj.status === 'NO_NEW_VALID_SIGNATURES') {
            errorMessage = 'Your account is not a required signer for this schedule, or you have already signed it.';
          } else if (errorObj.status === 'INVALID_SCHEDULE_ID') {
            errorMessage = 'This schedule has been deleted or does not exist. Refreshing list...';
            // Auto-refresh the list after a short delay
            setTimeout(() => loadPendingSchedules(), 2000);
          } else {
            errorMessage = errorObj.message || errorObj.status || errorMessage;
          }
        } catch {
          errorMessage = err;
        }
      } else if (err && typeof err === 'object' && Object.keys(err).length === 0) {
        errorMessage = 'Transaction was rejected or wallet popup was closed';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function viewScheduleDetails(scheduleId: string) {
    router.push(`/signer-dashboard/schedule/${scheduleId}`);
  }

  // Show connect screen if no Hedera account
  if (!accountId) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="max-w-md w-full bg-card rounded-lg border border-border p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">
                Signer Dashboard
              </h1>
              <p className="text-muted-foreground">
                Connect your wallet to view and approve pending transactions
              </p>
            </div>

            <button
              onClick={connectWallet}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark disabled:bg-muted text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Connecting...' : 'Connect HashPack Wallet'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-6">
        {/* Header */}
        <div className="mb-8 mt-12 flex items-center justify-between">
          <h1 className="text-5xl font-bold">Signer Dashboard</h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors"
            aria-label="Settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Rewards Balance Widget */}
        <div 
          className="mb-8 rounded-2xl shadow-sm p-[3px]"
          style={{
            background: 'linear-gradient(to right, #408FC7, #8CCBBA)'
          }}
        >
          <div className="bg-background rounded-2xl p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-5">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl flex items-center justify-center">
                  <img 
                    src="/key_ring_logo_lock_v1.svg" 
                    alt="KeyRing" 
                    className="w-14 h-14"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">KYRNG Rewards</h3>
                  <div className="flex items-baseline space-x-2.5">
                    <span className="text-5xl font-bold text-teal">
                      {rewardBalance.pending.toLocaleString()}
                    </span>
                    <span className="text-xl text-muted-foreground font-semibold">KYRNG</span>
                  </div>
                </div>
              </div>
              
              {rewardBalance.pending > 0 ? (
                <button
                  className="text-black text-2xl px-6 py-3 rounded-lg hover:opacity-80 transition-opacity"
                  style={{
                    background: 'linear-gradient(to right, #8CCBBA, #408FC7)',
                    border: '3px solid #8CCBBA'
                  }}
                >
                  Claim Rewards
                </button>
              ) : (
                <p className="text-muted-foreground">
                  Sign your first transaction to earn rewards
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Settings Slide-out Panel */}
        {showSettings && accountMetadata && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowSettings(false)}
            />
            
            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card z-50 shadow-2xl overflow-y-auto">
              <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-5xl font-bold mt-4">Account Settings</h2>
                      <p className="text-sm text-muted-foreground font-mono">{accountId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Account Info Content */}
                <div className="space-y-8">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Public Key</div>
                    <div className="text-sm font-mono bg-muted/40 p-4 rounded-xl break-all">
                      {accountMetadata.publicKey}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Recent Activity</div>
                    <div className="space-y-3">
                      {accountMetadata.recentTransactions.length > 0 ? (
                        accountMetadata.recentTransactions.slice(0, 5).map((tx) => (
                          <div key={tx.transaction_id} className="bg-muted/40 p-3 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider">{tx.name}</span>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                tx.result === 'SUCCESS' 
                                  ? 'bg-green-500/20 text-green-500' 
                                  : 'bg-red-500/20 text-red-500'
                              }`}>
                                {tx.result}
                              </span>
                            </div>
                            {tx.memo && (
                              <div className="text-xs text-muted-foreground mb-2 leading-relaxed">
                                {tx.memo}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground opacity-70">
                              {tx.consensus_timestamp}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-xl text-center">
                          No recent activity
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Threshold Lists Header with Refresh */}
        {pendingSchedules.length > 0 && (
          <div className="flex items-center justify-between mb-6 mt-12">
            <div>
              <h2 className="text-4xl font-bold">My Threshold Lists</h2>
              <p className="text-muted-foreground mt-1">
                {pendingSchedules.length} pending transaction{pendingSchedules.length !== 1 ? 's' : ''} awaiting signature
              </p>
            </div>
            <button
              onClick={loadPendingSchedules}
              disabled={loading}
              className="text-2xl text-teal hover:opacity-80 transition-opacity flex items-center gap-1.5 px-4 py-2 rounded-lg"
            >
              <svg className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        )}

        {/* Threshold Lists with Pending Transactions */}
        <div className="space-y-6">
          {loading && pendingSchedules.length === 0 ? (
            <div className="bg-muted/20 backdrop-blur-sm rounded-2xl p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading schedules...</p>
            </div>
          ) : pendingSchedules.length === 0 ? (
            <div className="bg-muted/20 backdrop-blur-sm rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium">No pending transactions</h3>
              <p className="mt-1 text-sm text-muted-foreground mb-6">
                You have no scheduled transactions awaiting your approval
              </p>
              
              {/* Generate Demo List Button */}
              <button
                onClick={generateDemoList}
                disabled={generatingDemo}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark disabled:bg-muted/50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {generatingDemo ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{demoGenerationStep || 'Generating...'}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Generate Demo List</span>
                  </>
                )}
              </button>
              
              {demoGenerationStep && !generatingDemo && (
                <p className="mt-4 text-sm text-green-500 font-semibold">
                  ✓ {demoGenerationStep}
                </p>
              )}
            </div>
          ) : (
            Object.entries(schedulesByThresholdList).map(([thresholdListId, schedules]) => {
              const isCollapsed = collapsedLists.has(thresholdListId);
              const listInfo = accountMetadata?.thresholdLists.find(list => list.accountId === thresholdListId);
              
              return (
                <div key={thresholdListId} className="bg-muted/20 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm">
                  {/* Threshold List Header */}
                  <div 
                    onClick={() => toggleThresholdList(thresholdListId)}
                    className="px-6 py-5 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-2xl font-bold">Threshold List</h3>
                          {listInfo && (
                            <span 
                              className="relative inline-block rounded-full p-[2px] ml-3"
                              style={{
                                background: 'linear-gradient(to right, #8CCBBA, #408FC7)'
                              }}
                            >
                              <span className="block font-semibold px-4 py-1 rounded-full bg-black relative">
                                <span 
                                  style={{
                                    background: 'linear-gradient(to right, #8CCBBA, #408FC7)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                  }}
                                >
                                  {listInfo.keyType}
                                </span>
                              </span>
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground font-mono">{thresholdListId}</p>
                        {listInfo && (
                          <p className="text-muted-foreground mt-1">{listInfo.memo}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <h2 className="text-4xl font-bold text-teal">{schedules.length}</h2>
                        <div className="text-2xl text-muted-foreground">Transactions</div>
                      </div>
                      <svg 
                        className={`w-6 h-6 text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-180'}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Pending Transactions under this Threshold List */}
                  {!isCollapsed && (
                    <div className="space-y-3 p-6 pt-0 pl-20">
                      {schedules.map((schedule) => {
                        const riskInfo = getRiskLevelFromMemo(schedule.memo);
                        return (
                          <div 
                            key={schedule.schedule_id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              viewScheduleDetails(schedule.schedule_id);
                            }}
                            className="bg-muted/30 hover:bg-muted/40 rounded-2xl p-5 transition-all cursor-pointer group"
                          >
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">
                                    {schedule.memo || 'Scheduled Transaction'}
                                  </h3>
                                  {riskInfo && (
                                    <span 
                                      className="inline-flex items-center rounded-full uppercase tracking-wider text-white ml-3"
                                      style={{
                                        backgroundColor: riskInfo.level === 'low' ? '#586022' :
                                                       riskInfo.level === 'medium' ? '#B89048' :
                                                       riskInfo.level === 'high' ? '#B0602E' :
                                                       riskInfo.level === 'critical' ? '#762616' : '#000000',
                                        paddingLeft: '1rem',
                                        paddingRight: '1rem',
                                        paddingTop: '0.5rem',
                                        paddingBottom: '0.375rem'
                                      }}
                                    >
                                      {riskInfo.label}
                                    </span>
                                  )}
                                </div>
                                <p className="text-muted-foreground font-mono">{schedule.schedule_id}</p>
                              </div>
                              <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                            
                            <div className="flex items-center gap-4 text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="font-mono">{schedule.creator_account_id}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{schedule.signatures?.length || 0} signatures</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Expires {new Date(parseFloat(schedule.expiration_time) * 1000).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Info Section */}
        <div
          className="mt-8 rounded-2xl p-[3px]"
          style={{
            background: 'linear-gradient(to right, #408FC7, #8CCBBA)'
          }}
        >
          <div className="bg-background rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold mb-3">How This Works</h3>
                <ul className="text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-teal mt-0.5">→</span>
                    <span>Scheduled transactions are created by project operators</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal mt-0.5">→</span>
                    <span>You'll see transactions that require your approval here</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal mt-0.5">→</span>
                    <span>Click "Sign Transaction" to approve via your HashPack wallet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal mt-0.5">→</span>
                    <span>Earn 10 KYRNG for each transaction you sign</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal mt-0.5">→</span>
                    <span>Transactions auto-execute once threshold is met</span>
                  </li>
            </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

