'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
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

interface RejectionInfo {
  scheduleId: string;
  reviewer: string;
  functionName?: string;
  reason: string;
  riskLevel?: string;
  timestamp?: string;
  consensusTimestamp?: string;
}

export default function SignerDashboardPage() {
  return (
    <Suspense fallback={null}>
      <SignerDashboard />
    </Suspense>
  );
}

function SignerDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected, connection, connectWallet: connectWalletProvider, dAppConnector, getPublicKey, publicKey } = useWallet();
  const [pendingSchedules, setPendingSchedules] = useState<PendingSchedule[]>([]);
  const [accountMetadata, setAccountMetadata] = useState<AccountMetadata | null>(null);
  const [rewardBalance, setRewardBalance] = useState<{
    lynx: { pending: number; paid: number };
    keyring: { pending: number; paid: number };
  }>({ lynx: { pending: 0, paid: 0 }, keyring: { pending: 0, paid: 0 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [collapsedLists, setCollapsedLists] = useState<Set<string>>(new Set());
  const [claimingRewards, setClaimingRewards] = useState(false);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'suspended' | 'revoked' | null>(null);
  const [rejections, setRejections] = useState<Record<string, RejectionInfo>>({});
  const [rejectedByMeIds, setRejectedByMeIds] = useState<Set<string>>(new Set());
  const [validatorReviews, setValidatorReviews] = useState<Record<string, { riskLevel?: string; recommendation?: string }>>({});

  // Get account ID (Hedera) or wallet address (Ethereum) from connection
  const { address: ethAddress } = useAccount();
  const accountId = connection?.type === 'hedera' ? connection.accountId : null;
  const walletAddress = connection?.type === 'base' ? connection.address : (ethAddress ?? null);
  const lookupId = accountId ?? walletAddress;
  
  // Get network configuration (must match NEXT_PUBLIC_HEDERA_NETWORK for mainnet migration)
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  const mirrorNodeUrl = network === 'mainnet'
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';
  const explorerBase = network === 'mainnet'
    ? 'https://hashscan.io/mainnet'
    : 'https://hashscan.io/testnet';
  
  // Show confirmation alert when redirected after signing
  useEffect(() => {
    const signedScheduleId = searchParams.get('signed');
    if (signedScheduleId) {
      setSuccessMessage(`Transaction signed successfully! Schedule ${signedScheduleId} — rewards recorded.`);
      router.replace('/signer-dashboard', { scroll: false });
      const timer = setTimeout(() => setSuccessMessage(null), 12000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  // Debug wallet state
  useEffect(() => {
    console.log('Dashboard wallet state:', { 
      isConnected, 
      connection: JSON.stringify(connection), 
      accountId,
      connectionType: connection?.type,
      network,
      mirrorNodeUrl
    });
  }, [isConnected, connection, accountId]);

  // Check registration status when wallet connects
  useEffect(() => {
    if (lookupId) {
      checkRegistrationStatus();
    }
  }, [lookupId]);

  // Load data only if registered (Hedera account required for Mirror Node / boost data)
  useEffect(() => {
    if (accountId && isRegistered === true) {
      loadAccountMetadata();
      loadPendingSchedules();
      loadRewardBalance();
      loadRejections();
      loadValidatorReviews();
    }
  }, [accountId, isRegistered]);

  async function connectWallet() {
    try {
      setLoading(true);
      setError(null);
      let result = await connectWalletProvider('hedera');
      if (!result) result = await connectWalletProvider('base');
      if (!result) setError('Please connect your wallet using the header');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }

  async function checkRegistrationStatus() {
    if (!lookupId) return;

    try {
      console.log('[DASHBOARD] Checking registration status for:', lookupId);
      
      const body = walletAddress
        ? { walletAddress }
        : { accountId };
      
      const response = await fetch('/api/signers/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('[DASHBOARD] Account is registered:', data.signer);
        setIsRegistered(true);
        setVerificationStatus((data.signer?.verificationStatus as 'pending' | 'verified' | 'suspended' | 'revoked') ?? null);
      } else {
        console.log('[DASHBOARD] Account is not registered');
        setIsRegistered(false);
        setVerificationStatus(null);
      }
    } catch (err: any) {
      console.error('[DASHBOARD] Error checking registration:', err);
      // If there's an error, assume not registered to be safe
      setIsRegistered(false);
      setVerificationStatus(null);
    }
  }

  async function loadAccountMetadata() {
    if (!accountId) return;

    try {
      console.log('[DASHBOARD] Loading account metadata for:', accountId);

      // Fetch account info from Mirror Node
      const accountResponse = await fetch(
        `${mirrorNodeUrl}/api/v1/accounts/${accountId}`
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
        `${mirrorNodeUrl}/api/v1/transactions?account.id=${accountId}&limit=20&order=desc`
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
  // Filter out schedules user rejected and expired schedules (defensive filter)
  const now = Date.now();
  const displaySchedules = pendingSchedules.filter((s) => {
    if (rejectedByMeIds.has(s.schedule_id)) return false;
    const exp = s.expiration_time;
    if (exp != null && exp !== '') {
      const expMs = (typeof exp === 'string' ? parseFloat(exp) : Number(exp)) * 1000;
      if (!Number.isNaN(expMs) && now > expMs) return false;
    }
    return true;
  });
  const schedulesByThresholdList = displaySchedules.reduce((acc, schedule) => {
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
        setRewardBalance({ lynx: { pending: 0, paid: 0 }, keyring: { pending: 0, paid: 0 } });
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        const rewards = data.rewards || [];
        const byCurrency = (currency: string) => {
          const filtered = rewards.filter((r: { currency?: string }) => (r.currency || 'KYRNG') === currency);
          return {
            pending: filtered.filter((r: { status?: string }) => r.status === 'pending').reduce((s: number, r: { amount?: number }) => s + parseFloat(String(r.amount || 0)), 0),
            paid: filtered.filter((r: { status?: string }) => r.status === 'paid').reduce((s: number, r: { amount?: number }) => s + parseFloat(String(r.amount || 0)), 0),
          };
        };
        setRewardBalance({
          lynx: byCurrency('LYNX'),
          keyring: byCurrency('KYRNG'),
        });
        console.log('[DASHBOARD] Reward balance loaded:', { lynx: byCurrency('LYNX'), keyring: byCurrency('KYRNG') });
      } else {
        setRewardBalance({ lynx: { pending: 0, paid: 0 }, keyring: { pending: 0, paid: 0 } });
      }
    } catch (err: unknown) {
      console.error('Error loading reward balance:', err);
      setRewardBalance({ lynx: { pending: 0, paid: 0 }, keyring: { pending: 0, paid: 0 } });
    }
  }

  async function loadRejections() {
    try {
      const response = await fetch('/api/rejections');
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && data.data) {
        setRejections(data.data);
      }
    } catch (err) {
      console.error('[DASHBOARD] Error loading rejections:', err);
    }
  }

  async function loadValidatorReviews() {
    // Validator reviews are loaded per-schedule on the detail page.
    // No bulk load needed for the dashboard list view.
  }

  async function claimRewards() {
    if (!accountId) {
      setError('Please connect your wallet first');
      return;
    }

    const totalPending = rewardBalance.lynx.pending + rewardBalance.keyring.pending;
    if (totalPending <= 0) {
      setError('No pending rewards to claim');
      return;
    }

    if (!dAppConnector) {
      setError('Wallet not connected properly');
      return;
    }

    try {
      setClaimingRewards(true);
      setError(null);
      setSuccessMessage(null);

      console.log('[DASHBOARD] Claiming rewards for:', accountId);

      const rewardNetwork = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
      const kyrngTokenId = rewardNetwork === 'mainnet'
        ? process.env.NEXT_PUBLIC_MAINNET_KYRNG
        : process.env.NEXT_PUBLIC_TESTNET_KYRNG;
      const lynxTokenId = rewardNetwork === 'mainnet'
        ? process.env.NEXT_PUBLIC_MAINNET_LYNX
        : process.env.NEXT_PUBLIC_TESTNET_LYNX;

      const tokensToAssociate: string[] = [];

      const rewardTokens = [
        { id: kyrngTokenId, name: 'Keyring', hasPending: rewardBalance.keyring.pending > 0 },
        { id: lynxTokenId, name: 'LYNX', hasPending: rewardBalance.lynx.pending > 0 },
      ];

      for (const token of rewardTokens) {
        if (!token.id || !token.hasPending) continue;

        const res = await fetch(
          `${mirrorNodeUrl}/api/v1/accounts/${accountId}/tokens?token.id=${token.id}`
        );
        const data = await res.json();
        const associated = data.tokens && data.tokens.length > 0;
        console.log(`[DASHBOARD] ${token.name} (${token.id}) association:`, associated);

        if (!associated) tokensToAssociate.push(token.id);
      }

      if (tokensToAssociate.length > 0) {
        console.log('[DASHBOARD] Associating tokens:', tokensToAssociate);

        const { TokenAssociateTransaction, TokenId } = await import('@hashgraph/sdk');
        const signer = dAppConnector.getSigner(AccountId.fromString(accountId));

        const associateTx = new TokenAssociateTransaction()
          .setAccountId(accountId)
          .setTokenIds(tokensToAssociate.map((id) => TokenId.fromString(id)));

        const frozenAssociateTx = await associateTx.freezeWithSigner(signer);
        const associateResponse = await frozenAssociateTx.executeWithSigner(signer);

        const associateTransactionId = associateResponse.transactionId?.toString();
        if (!associateTransactionId) {
          throw new Error('Token association failed or was rejected');
        }

        console.log('[DASHBOARD] Token association successful:', associateTransactionId);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Now proceed with claiming rewards
      console.log('[DASHBOARD] Requesting token transfer...');

      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim rewards');
      }

      console.log('[DASHBOARD] Rewards claimed successfully:', data);

      // Show success message
      setSuccessMessage(`Successfully claimed rewards! Transaction ID: ${data.transactionId}`);
      setError(null);

      // Reload reward balance from database to reflect the 'paid' status
      await loadRewardBalance();

      // Clear success message after 10 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 10000);

    } catch (err: any) {
      console.error('[DASHBOARD] Error claiming rewards:', err);
      setError(err.message || 'Failed to claim rewards');
    } finally {
      setClaimingRewards(false);
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
        `${mirrorNodeUrl}/api/v1/accounts/${accountId}`
      );
      const myAccountData = await myAccountResponse.json();
      const myPublicKey = myAccountData.key?._type === 'ED25519' ? myAccountData.key.key : null;

      if (!myPublicKey) {
        console.error('[DASHBOARD] Could not retrieve public key');
        setError('Could not retrieve account public key');
        return;
      }

      console.log('[DASHBOARD] My public key:', myPublicKey);

      // Discover accounts to query for schedules:
      // 1. The Lynx operator account (creates schedules)
      // 2. Threshold list accounts this signer belongs to (payer on schedules)
      const accountsToQuery = new Set<string>();

      const lynxOperator = process.env.NEXT_PUBLIC_LYNX_OPERATOR_ACCOUNT_ID;
      if (lynxOperator) accountsToQuery.add(lynxOperator);

      const lynxContractOperator = process.env.NEXT_PUBLIC_LYNX_CONTRACT_OPERATOR_ACCOUNT_ID;
      if (lynxContractOperator) accountsToQuery.add(lynxContractOperator);

      // Find threshold lists containing the signer's public key
      try {
        const thresholdRes = await fetch(`/api/signers/threshold-lists-for-account?accountId=${accountId}`);
        if (thresholdRes.ok) {
          const thresholdData = await thresholdRes.json();
          const lists: string[] = thresholdData.thresholdAccountIds || [];
          for (const id of lists) accountsToQuery.add(id);
        }
      } catch {
        // Continue with operator-only query
      }

      if (accountsToQuery.size === 0) {
        console.warn('[DASHBOARD] No operator or threshold accounts to query');
        setPendingSchedules([]);
        return;
      }

      const allPendingSchedules: PendingSchedule[] = [];
      const seenScheduleIds = new Set<string>();

      for (const queryAccountId of accountsToQuery) {
        console.log('[DASHBOARD] Querying schedules from:', queryAccountId);

        const response = await fetch(
          `${mirrorNodeUrl}/api/v1/schedules?account.id=${queryAccountId}&order=desc&limit=50`
        );

        if (!response.ok) continue;

        const data = await response.json();
        const schedules = data.schedules || [];

        console.log(`[DASHBOARD] Found ${schedules.length} schedules from ${queryAccountId}`);

        // Filter and check each schedule
        for (const schedule of schedules) {
          // Skip executed or deleted schedules
          if (schedule.executed_timestamp || schedule.deleted) {
            continue;
          }

          // Skip expired schedules (expiration_time is seconds.nanoseconds since epoch)
          const expTime = schedule.expiration_time;
          if (expTime != null && expTime !== '') {
            const expSeconds = typeof expTime === 'string' ? parseFloat(expTime) : Number(expTime);
            if (!Number.isNaN(expSeconds) && Date.now() > expSeconds * 1000) {
              continue;
            }
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
                  `${mirrorNodeUrl}/api/v1/accounts/${acctId}`
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

            if (requiresMySignature && !seenScheduleIds.has(schedule.schedule_id)) {
              seenScheduleIds.add(schedule.schedule_id);
              allPendingSchedules.push(schedule);
            }

          } catch (err) {
            console.error('[DASHBOARD] Error processing schedule:', schedule.schedule_id, err);
          }
        }
      }

      console.log('[DASHBOARD] Total pending schedules requiring my signature:', allPendingSchedules.length);

      // Fetch schedule IDs this user has rejected (HCS message on threshold topic)
      let rejectedIds = new Set<string>();
      if (allPendingSchedules.length > 0) {
        try {
          const res = await fetch('/api/rejections/by-signer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId,
              schedules: allPendingSchedules.map((s) => ({
                schedule_id: s.schedule_id,
                payer_account_id: s.payer_account_id,
              })),
            }),
          });
          if (res.ok) {
            const data = await res.json();
            rejectedIds = new Set(data.rejectedIds || []);
            if (rejectedIds.size > 0) {
              console.log('[DASHBOARD] Found', rejectedIds.size, 'schedules rejected by me');
            }
          }
        } catch (err) {
          console.warn('[DASHBOARD] Could not load my rejections:', err);
        }
      }
      setRejectedByMeIds(rejectedIds);
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
        `${mirrorNodeUrl}/api/v1/schedules/${scheduleId}`
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

  // Show connect screen if no wallet connected
  if (!lookupId) {
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
              {loading ? 'Connecting...' : 'Connect Wallet'}
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

  // Show loading screen while checking registration
  if (isRegistered === null) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="max-w-md w-full bg-card rounded-lg border border-border p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Checking account registration...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show Become A Signer prompt if account is not registered
  if (isRegistered === false) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="max-w-md w-full bg-card rounded-lg border border-border p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold mb-2">
                Become A Signer
              </h1>
              <p className="text-muted-foreground mb-2">
                Your wallet <span className="font-mono text-primary">{lookupId}</span> is not yet registered.
              </p>
              <p className="text-muted-foreground">
                Register now to participate in boost transactions. Complete KYC from your dashboard when you&apos;re ready for real projects.
              </p>
            </div>

            <button
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  if (walletAddress) {
                    const res = await fetch('/api/signers/ethereum', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ wallet_address: walletAddress }),
                    });
                    const data = await res.json();
                    if (!data.success && !data.signer) throw new Error(data.error || 'Registration failed');
                  } else if (accountId) {
                    let currentPublicKey = publicKey;
                    if (!currentPublicKey) currentPublicKey = await getPublicKey(accountId);
                    if (!currentPublicKey) {
                      const res = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId}`);
                      const acc = await res.json();
                      currentPublicKey = acc.key?.key ?? null;
                    }
                    if (!currentPublicKey) throw new Error('Could not obtain public key');
                    const res = await fetch('/api/signers/hedera', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ account_id: accountId, public_key: currentPublicKey }),
                    });
                    const data = await res.json();
                    if (!data.success && !data.signer) throw new Error(data.error || 'Registration failed');
                  } else {
                    throw new Error('Wallet not connected');
                  }
                  await checkRegistrationStatus();
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : 'Registration failed');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Registering...' : 'Become A Signer'}
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
        <div className="mb-8 mt-12 flex items-center justify-between flex-wrap gap-4">
          <h1 className="font-bold">Signer Dashboard</h1>
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

        {/* Ethereum-only: prompt to connect Hedera for boost transactions */}
        {walletAddress && !accountId && isRegistered && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-200/90">
              Connect your Hedera (HashPack) wallet to participate in boost transactions and view pending schedules.
            </p>
          </div>
        )}

        {/* KYC Completion Alert - shown when user is registered but verification is pending */}
        {verificationStatus === 'pending' && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-400 mb-1">Complete KYC for Real Projects</h3>
                <p className="text-sm text-amber-200/90 mb-3">
                  You can participate in boost transactions now. Complete identity verification to qualify for real projects with greater rewards.
                </p>
                <button
                  onClick={() => router.push('/verify')}
                  className="text-sm font-medium text-amber-400 hover:text-amber-300 underline"
                >
                  Complete KYC Verification →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-green-400 text-sm">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-500 hover:text-green-400 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-400 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Rewards Balance Widget */}
        <div 
          className="mb-8 rounded-2xl shadow-sm p-[3px]"
          style={{
            background: 'linear-gradient(to right, #408FC7, #8CCBBA)'
          }}
        >
          <div className="bg-background rounded-2xl p-8">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-8">
                {/* Keyring Rewards */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl flex items-center justify-center overflow-hidden p-2">
                    <img 
                      src="/key_ring_logo_lock_v1.svg" 
                      alt="Keyring" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Keyring</h3>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-teal">
                        {rewardBalance.keyring.pending.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
                {/* LYNX Rewards */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl flex items-center justify-center overflow-hidden">
                    <img 
                      src="/lynx.png" 
                      alt="Lynx" 
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">LYNX</h3>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-teal">
                        {rewardBalance.lynx.pending.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {(rewardBalance.lynx.pending > 0 || rewardBalance.keyring.pending > 0) ? (
                <button
                  onClick={claimRewards}
                  disabled={claimingRewards}
                  className="text-black text-xl px-6 py-3 rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(to right, #8CCBBA, #408FC7)',
                    border: '3px solid #8CCBBA'
                  }}
                >
                  {claimingRewards ? 'Claiming...' : 'Claim Rewards'}
                </button>
              ) : (
                <p className="text-muted-foreground">
                  Sign transactions to earn Keyring & LYNX rewards
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
                      <h2 className="font-bold mt-4">Account Settings</h2>
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
              <h2 className="font-bold">My Threshold Lists</h2>
              <p className="text-muted-foreground mt-1">
                {pendingSchedules.length} pending transaction{pendingSchedules.length !== 1 ? 's' : ''} awaiting signature
              </p>
            </div>
            <button
                onClick={() => {
              loadPendingSchedules();
                loadRejections();
                loadValidatorReviews();
              }}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-teal hover:opacity-80 transition-opacity bg-muted/30 hover:bg-muted/50"
              >
                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <p className="mt-1 text-sm text-muted-foreground">
                You have no scheduled transactions awaiting your approval
              </p>
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
                          <h3 className="text-xl font-bold">Threshold List</h3>
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
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Account ID:</span>{' '}
                          <a 
                            href={`${explorerBase}/account/${thresholdListId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono hover:text-teal transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {thresholdListId}
                          </a>
                        </p>
                        {listInfo && (
                          <p className="text-muted-foreground mt-1">{listInfo.memo}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <h2 className="text-4xl font-bold text-teal">{schedules.length}</h2>
                        <div className="text-xl text-muted-foreground">Transactions</div>
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
                        const rejection = rejections[schedule.schedule_id];
                        const validator = validatorReviews[schedule.schedule_id];
                        const riskLevel = rejection?.riskLevel || validator?.riskLevel;
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
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                                    {schedule.memo || 'Scheduled Transaction'}
                                  </h3>
                                  {rejection && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/50">
                                      REJECTED BY AGENT
                                    </span>
                                  )}
                                  {riskLevel && (
                                    <span 
                                      className="inline-flex items-center rounded-full uppercase tracking-wider text-white ml-3"
                                      style={{
                                        backgroundColor: riskLevel === 'low' ? '#586022' :
                                                       riskLevel === 'medium' ? '#B89048' :
                                                       riskLevel === 'high' ? '#B0602E' :
                                                       riskLevel === 'critical' ? '#762616' : '#4a5568',
                                        paddingLeft: '1rem',
                                        paddingRight: '1rem',
                                        paddingTop: '0.5rem',
                                        paddingBottom: '0.375rem'
                                      }}
                                    >
                                      {riskLevel} RISK
                                    </span>
                                  )}
                                </div>
                                <p className="text-muted-foreground">
                                  <span className="font-semibold">Schedule ID:</span>{' '}
                                  <a 
                                    href={`${explorerBase}/schedule/${schedule.schedule_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono hover:text-teal transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {schedule.schedule_id}
                                  </a>
                                </p>
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
                    <span>Earn Keyring & LYNX rewards for each transaction you sign</span>
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

