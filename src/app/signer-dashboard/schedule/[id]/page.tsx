'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Buffer } from 'buffer';
import Header from '../../../../components/Header';
import { useWallet } from '../../../../providers/WalletProvider';
import { 
  ScheduleSignTransaction, 
  ScheduleId,
  AccountId,
  TransactionId,
  Client,
  TopicMessageQuery,
  TopicMessageSubmitTransaction,
  PrivateKey
} from '@hashgraph/sdk';

interface ScheduleDetails {
  schedule_id: string;
  creator_account_id: string;
  payer_account_id: string;
  memo: string;
  consensus_timestamp: string;
  expiration_time: string;
  executed_timestamp: string | null;
  deleted: boolean;
  admin_key: any;
  wait_for_expiry: boolean;
  signatures: {
    consensus_timestamp: string;
    public_key_prefix: string;
    signature: string;
    type: string;
  }[];
  transaction_body?: any;
}

interface HCSMessage {
  consensusTimestamp: string;
  message: string;
  sequenceNumber: number;
  runningHash: string;
}

interface ThresholdListData {
  id: string;
  hcs_topic_id: string;
  threshold_account_id: string;
  status: string;
}

export default function ScheduleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id as string;
  const { connection, dAppConnector } = useWallet();
  const accountId = connection?.type === 'hedera' ? connection.accountId : null;

  // Get network configuration
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  const mirrorNodeUrl = network === 'mainnet'
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';

  const [schedule, setSchedule] = useState<ScheduleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);
  const [hcsMessages, setHcsMessages] = useState<HCSMessage[]>([]);
  const [thresholdListData, setThresholdListData] = useState<ThresholdListData | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [agentRejection, setAgentRejection] = useState<{
    scheduleId: string;
    reviewer: string;
    functionName?: string;
    reason: string;
    riskLevel?: string;
    timestamp?: string;
  } | null>(null);
  const [agentValidator, setAgentValidator] = useState<{
    scheduleId: string;
    reviewer: string;
    functionName?: string;
    recommendation: string;
    riskLevel?: string;
    timestamp?: string;
  } | null>(null);
  const [expandedSigIndex, setExpandedSigIndex] = useState<number | null>(null);
  const [technicalDetailsExpanded, setTechnicalDetailsExpanded] = useState(false);

  useEffect(() => {
    loadScheduleDetails();
  }, [scheduleId]);

  async function loadScheduleDetails() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${mirrorNodeUrl}/api/v1/schedules/${scheduleId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load schedule details');
      }

      const data = await response.json();
      setSchedule(data);

      // Load rejection messages for this transaction
      if (data.payer_account_id) {
        loadHCSMessages(data.payer_account_id);
      }

      // Load agent rejections from PROJECT_REJECTION_TOPIC
      try {
        const rejRes = await fetch('/api/rejections');
        if (rejRes.ok) {
          const rejData = await rejRes.json();
          if (rejData.success && rejData.data?.[scheduleId]) {
            setAgentRejection(rejData.data[scheduleId]);
          } else {
            setAgentRejection(null);
          }
        }
      } catch {
        setAgentRejection(null);
      }

      // Load agent validator review from PROJECT_VALIDATOR_TOPIC (when agent signed)
      try {
        const valRes = await fetch('/api/validator-reviews');
        if (valRes.ok) {
          const valData = await valRes.json();
          if (valData.success && valData.data?.[scheduleId]) {
            setAgentValidator(valData.data[scheduleId]);
          } else {
            setAgentValidator(null);
          }
        }
      } catch {
        setAgentValidator(null);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }

  async function loadHCSMessages(payerAccountId: string) {
    try {
      setLoadingMessages(true);
      console.log('[REJECTIONS] Loading threshold list data for:', payerAccountId);

      // Fetch threshold list data to get rejection topic ID
      const response = await fetch(`/api/threshold-lists/${payerAccountId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[REJECTIONS] API error:', response.status, errorData);
        
        if (response.status === 404) {
          console.log('[REJECTIONS] No threshold list found for this payer account');
          return;
        }
        throw new Error(`Failed to fetch threshold list data: ${errorData.error || response.statusText}`);
      }

      const thresholdList = await response.json();
      setThresholdListData(thresholdList);
      console.log('[REJECTIONS] Threshold list data:', thresholdList);

      // Fetch topic messages from Mirror Node API
      if (thresholdList.hcs_topic_id) {
        await fetchTopicMessages(thresholdList.hcs_topic_id);
      }

    } catch (err: any) {
      console.error('[REJECTIONS] Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function fetchTopicMessages(topicId: string) {
    try {
      console.log('[REJECTIONS] Fetching messages from topic:', topicId);

      // Fetch messages from Mirror Node REST API
      const response = await fetch(
        `${mirrorNodeUrl}/api/v1/topics/${topicId}/messages?limit=100&order=desc`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch topic messages: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[REJECTIONS] Topic messages response:', data);

      if (data.messages && data.messages.length > 0) {
        // Parse messages and filter for this schedule
        const messages: HCSMessage[] = [];
        
        for (const msg of data.messages) {
          try {
            // Decode base64 message
            const messageString = Buffer.from(msg.message, 'base64').toString('utf8');
            console.log('[REJECTIONS] Decoded message:', messageString);

            // Check if message is related to this schedule
            if (messageString.includes(scheduleId)) {
              messages.push({
                consensusTimestamp: msg.consensus_timestamp,
                message: messageString,
                sequenceNumber: msg.sequence_number,
                runningHash: msg.running_hash
              });
            }
          } catch (e) {
            console.error('[REJECTIONS] Error parsing message:', e);
          }
        }

        console.log('[REJECTIONS] Filtered messages for this schedule:', messages);
        setHcsMessages(messages);
      } else {
        console.log('[REJECTIONS] No messages found on topic');
      }

    } catch (err: any) {
      console.error('[REJECTIONS] Error fetching topic messages:', err);
    }
  }

  async function submitRejectionToHCS() {
    console.log('[REJECTIONS] Submit rejection called:', { 
      hasThresholdListData: !!thresholdListData, 
      topicId: thresholdListData?.hcs_topic_id,
      hasFeedback: !!rejectionFeedback.trim()
    });

    if (!thresholdListData?.hcs_topic_id) {
      const msg = 'Cannot submit rejection: Threshold list not found for this transaction';
      console.error('[REJECTIONS]', msg);
      setError(msg);
      return;
    }

    if (!rejectionFeedback.trim()) {
      setError('Please provide feedback explaining your rejection');
      return;
    }

    if (!accountId || !dAppConnector) {
      setError('Please connect your HashPack wallet first');
      return;
    }

    try {
      setSubmittingRejection(true);
      setError(null);

      console.log('[REJECTIONS] Submitting rejection to topic:', thresholdListData.hcs_topic_id);

      const rejectionMessage = JSON.stringify({
        type: 'rejection',
        scheduleId: scheduleId,
        signer: accountId,
        feedback: rejectionFeedback,
        timestamp: new Date().toISOString()
      });

      // Get HashPack signer
      const signer = dAppConnector.getSigner(AccountId.fromString(accountId));
      
      // Create topic message submit transaction
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(thresholdListData.hcs_topic_id)
        .setMessage(rejectionMessage);

      console.log('[REJECTIONS] Signing with HashPack...');

      // Freeze with signer and execute via HashPack
      const frozenTx = await transaction.freezeWithSigner(signer);
      const txResponse = await frozenTx.executeWithSigner(signer);
      
      console.log('[REJECTIONS] Transaction response:', txResponse);
      console.log('[REJECTIONS] Transaction ID:', txResponse.transactionId?.toString());

      console.log('[REJECTIONS] Rejection posted successfully');
      setShowRejectForm(false);
      setRejectionFeedback('');
      
      // Reload messages to show the new rejection (wait for mirror node to process)
      setTimeout(() => {
        if (thresholdListData?.hcs_topic_id) {
          fetchTopicMessages(thresholdListData.hcs_topic_id);
        }
      }, 3000);

    } catch (err: any) {
      console.error('[REJECTIONS] Error submitting rejection:', err);
      setError(err.message || 'Failed to submit rejection to topic');
    } finally {
      setSubmittingRejection(false);
    }
  }

  async function approveSchedule() {
    if (!accountId || !dAppConnector) {
      setError('Please connect your HashPack wallet first');
      return;
    }

    try {
      setSigning(true);
      setError(null);

      console.log('[DETAIL] Approving schedule', scheduleId, 'with account', accountId);

      // Fetch schedule details to check if already signed
      const scheduleResponse = await fetch(
        `${mirrorNodeUrl}/api/v1/schedules/${scheduleId}`
      );

      if (!scheduleResponse.ok) {
        throw new Error('Failed to fetch schedule details');
      }

      const scheduleData = await scheduleResponse.json();
      console.log('[DETAIL] Schedule details:', scheduleData);

      // Check if the user has already signed
      const userPublicKeyResponse = await fetch(
        `${mirrorNodeUrl}/api/v1/accounts/${accountId}`
      );
      const userData = await userPublicKeyResponse.json();
      const userPublicKey = userData.key?.key;

      const alreadySigned = scheduleData.signatures?.some((sig: any) => 
        sig.public_key_prefix === userPublicKey
      );

      if (alreadySigned) {
        setError('You have already signed this transaction');
        return;
      }

      // Get signer from dAppConnector
      const signer = dAppConnector.getSigner(AccountId.fromString(accountId));

      // Create ScheduleSignTransaction
      const transaction = new ScheduleSignTransaction()
        .setScheduleId(ScheduleId.fromString(scheduleId))
        .setTransactionMemo(`KeyRing: Sign ${scheduleId}`);

      console.log('[DETAIL] Signing with HashPack...');

      // Execute with signer
      const frozenTx = await transaction.freezeWithSigner(signer);
      const txResponse = await frozenTx.executeWithSigner(signer);

      console.log('[DETAIL] Transaction response:', txResponse);

      // Get transaction receipt
      const signTransactionId = txResponse.transactionId?.toString();
      console.log('[DETAIL] Sign transaction ID:', signTransactionId);

      // Record reward
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
            console.log('[DETAIL] Reward recorded:', rewardData.reward);
          }
        } catch (rewardErr) {
          console.error('[DETAIL] Error recording reward:', rewardErr);
        }
      }

      // Reload schedule after signing
      await loadScheduleDetails();
      setError(null);

    } catch (err: any) {
      console.error('[DETAIL] Error signing schedule:', err);
      
      if (err.message?.includes('NO_NEW_VALID_SIGNATURES')) {
        setError('You have already signed this transaction or your signature is not required');
      } else if (err.message?.includes('INVALID_SCHEDULE_ID')) {
        setError('This schedule has already been executed or deleted');
      } else if (err.message?.includes('rejected') || err.message?.includes('closed')) {
        setError('Transaction was rejected or wallet popup was closed');
      } else {
      setError(err.message || 'Failed to sign schedule');
      }
    } finally {
      setSigning(false);
    }
  }

  // Helper function to decode protobuf varint
  function decodeVarint(buf: Buffer, offset: number): { value: number; offset: number } {
    let result = 0;
    let shift = 0;
    let i = offset;
    while (i < buf.length) {
      const byte = buf[i++];
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return { value: result, offset: i };
      shift += 7;
    }
    return { value: result, offset: i };
  }

  // Helper function to extract accounts from protobuf hex
  function extractAccountsFromHex(hex: string): string[] {
    const accounts: string[] = [];
    for (let i = 0; i < hex.length - 8; i += 2) {
      // Look for account ID field pattern (field 1, type 0, subfield 3 = 0x18)
      if (hex.slice(i, i + 4) === '0518') {
        const accountHex = hex.slice(i + 4, i + 14);
        const accountBuf = Buffer.from(accountHex, 'hex');
        const decoded = decodeVarint(accountBuf, 0);
        accounts.push(`0.0.${decoded.value}`);
      }
    }
    return accounts;
  }

  function parseTransactionBody(transactionBody: any) {
    // Parse the transaction body to understand what it's doing
    if (!transactionBody) return null;

    try {
      // If transaction_body is a base64 string, try to decode and parse it
      if (typeof transactionBody === 'string') {
        try {
          // Decode base64 to get the protobuf bytes
          const decoded = Buffer.from(transactionBody, 'base64');
          const hex = decoded.toString('hex');
          
          // Extract accounts involved in the transaction
          const accounts = extractAccountsFromHex(hex);
          
          // Look at the memo field for additional context FIRST
          const memoMatch = schedule?.memo?.toLowerCase() || '';
          
          // Check for BoostProject transactions FIRST before protobuf detection
          if (memoMatch.includes('boostproject:')) {
            const txTypeMatch = memoMatch.match(/boostproject:\s*(\w+)/i);
            const txType = txTypeMatch ? txTypeMatch[1].toUpperCase().replace(/_/g, ' ') : 'UNKNOWN';
            
            // Extract description from contract call parameters (first string parameter)
            let extractedDescription = 'Review transaction details carefully before signing.';
            try {
              // Convert hex to ASCII and extract readable strings
              const asciiText = hex.replace(/../g, (byte) => {
                const code = parseInt(byte, 16);
                return (code >= 32 && code <= 126) ? String.fromCharCode(code) : ' ';
              });
              
              // Find long readable strings (likely the description parameter)
              const matches = asciiText.match(/[A-Za-z0-9][A-Za-z0-9\s\-,.:;!?()\[\]]{30,200}/g);
              if (matches && matches.length > 0) {
                extractedDescription = matches[0].trim();
              }
            } catch (e) {
              console.log('[PARSE] Could not extract description from hex:', e);
            }
            
            return {
              type: txType,
              details: { 
                raw: transactionBody, 
                hex: hex.substring(0, 100) + '...',
                accounts: accounts,
                decoded: accounts.length > 0 ? `Contract call involving: ${accounts.join(', ')}` : 'BoostProject contract interaction'
              },
              description: extractedDescription,
              risk: null
            };
          }
          
          // Detect transaction type from protobuf field tags
          // Field 9 (0x4a) = CryptoTransfer
          // Field 7 (0x3a) = ContractCall
          // Field 5 (0x2a) = ContractCreateInstance
          // Field 29 (0xe801 or 0xe802) = TokenUpdate
          
          const isCryptoTransfer = hex.includes('4a') && hex.indexOf('4a') < 20;
          const isContractCall = hex.includes('3a') && hex.indexOf('3a') < 20;
          const isTokenOperation = hex.includes('e801') || hex.includes('e802') || hex.includes('e901');
          
          if (isCryptoTransfer) {
            return {
              type: 'HBAR/Token Transfer',
              details: { 
                raw: transactionBody, 
                hex: hex.substring(0, 100) + '...',
                accounts: accounts,
                decoded: `Transfer between ${accounts.length} accounts`
              },
              description: schedule?.memo || `Transfer HBAR or tokens between accounts: ${accounts.join(', ')}`,
              risk: null // Will be assessed by AI
            };
          }
          
          if (isContractCall || memoMatch.includes('contract') || memoMatch.includes('boost')) {
            return {
              type: 'Smart Contract Call',
              details: { 
                raw: transactionBody, 
                hex: hex.substring(0, 100) + '...',
                accounts: accounts,
                decoded: accounts.length > 0 ? `Involves accounts: ${accounts.join(', ')}` : 'Contract interaction'
              },
              description: schedule?.memo || 'Execute a function on a smart contract. The contract call details are encoded in the transaction body.',
              risk: null // Will be assessed by AI
            };
          }
          
          if (isTokenOperation || (memoMatch.includes('token') && (memoMatch.includes('mint') || memoMatch.includes('burn') || memoMatch.includes('update')))) {
            const tokenType = memoMatch.includes('mint') ? 'Mint' : 
                             memoMatch.includes('burn') ? 'Burn' : 
                             memoMatch.includes('update') ? 'Update' : 'Operation';
            return {
              type: `Token ${tokenType}`,
              details: { 
                raw: transactionBody, 
                hex: hex.substring(0, 100) + '...',
                accounts: accounts,
                decoded: accounts.length > 0 ? `Involves accounts: ${accounts.join(', ')}` : 'Token operation'
              },
              description: schedule?.memo || `${tokenType} tokens. Review carefully before signing.`,
              risk: null // Will be assessed by AI
            };
          }
          
          if (memoMatch.includes('update') || memoMatch.includes('modify')) {
            return {
              type: 'Account/Contract Update',
              details: { 
                raw: transactionBody, 
                hex: hex.substring(0, 100) + '...',
                accounts: accounts,
                decoded: accounts.length > 0 ? `Involves accounts: ${accounts.join(', ')}` : 'Update operation'
              },
              description: schedule?.memo || 'Modify account or contract settings. Review carefully before signing.',
              risk: null // Will be assessed by AI
            };
          }
          
          // Default case with decoded information
          return {
            type: 'Hedera Transaction',
            details: { 
              raw: transactionBody, 
              hex: hex.substring(0, 100) + '...',
              accounts: accounts,
              decoded: accounts.length > 0 ? `Involves accounts: ${accounts.join(', ')}` : 'Transaction details encoded in protobuf format'
            },
            description: schedule?.memo || 'A scheduled Hedera transaction. The memo field above provides details about what this transaction does.',
            risk: null // Will be assessed by AI
          };
        } catch (decodeError) {
          console.error('Error decoding transaction body:', decodeError);
        }
      }
      
      // Handle structured transaction body (JSON object)
      if (transactionBody.cryptoTransfer) {
        return {
          type: 'HBAR Transfer',
          details: transactionBody.cryptoTransfer,
          description: 'Transfer HBAR between accounts',
          risk: null // Will be assessed by AI
        };
      }
      if (transactionBody.contractCall) {
        return {
          type: 'Contract Execution',
          details: transactionBody.contractCall,
          description: 'Execute function on smart contract',
          risk: null // Will be assessed by AI
        };
      }
      if (transactionBody.contractUpdateInstance) {
        return {
          type: 'Contract Update',
          details: transactionBody.contractUpdateInstance,
          description: 'Update smart contract (REQUIRES CAREFUL REVIEW)',
          risk: null // Will be assessed by AI
        };
      }
      if (transactionBody.tokenMint) {
        return {
          type: 'Token Mint',
          details: transactionBody.tokenMint,
          description: 'Mint new tokens',
          risk: null // Will be assessed by AI
        };
      }

      return {
        type: 'Hedera Transaction',
        details: transactionBody,
        description: schedule?.memo || 'A scheduled Hedera transaction. Review the memo and raw data carefully.',
        risk: null // Will be assessed by AI
      };
    } catch (error) {
      console.error('Error parsing transaction body:', error);
      return {
        type: 'Hedera Transaction',
        details: transactionBody,
        description: schedule?.memo || 'Unable to parse transaction details. Please review carefully.',
        risk: null // Will be assessed by AI
      };
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center p-4 pt-20">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading schedule details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center p-4 pt-20">
          <div className="max-w-md w-full bg-muted/20 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
            <h2 className="text-xl font-bold mb-2">Error Loading Schedule</h2>
            <p className="text-muted-foreground mb-6">{error || 'Schedule not found'}</p>
          <Link
            href="/signer-dashboard"
              className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold rounded-xl transition-all"
          >
            Back to Dashboard
          </Link>
          </div>
        </div>
      </div>
    );
  }

  const transactionInfo = parseTransactionBody(schedule.transaction_body);
  const isExecuted = !!schedule.executed_timestamp;

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-6">
        {/* Back Button & Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link
              href="/signer-dashboard"
              className="inline-flex items-center hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span>Schedule: <span className="font-mono">{scheduleId}</span></span>
          </div>
          <h1 className="text-3xl font-bold">Transaction Details</h1>
      </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-500/10 rounded-2xl p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-red-500 font-semibold">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Transaction Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaction Details */}
            {transactionInfo && (
              <div className="bg-muted/20 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-5">
                  <div className="space-y-5">
                  <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Transaction Type</label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-lg font-bold">{transactionInfo.type}</p>
                        {(agentRejection?.riskLevel || agentValidator?.riskLevel) && (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            (agentRejection?.riskLevel || agentValidator?.riskLevel) === 'low' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            (agentRejection?.riskLevel || agentValidator?.riskLevel) === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            (agentRejection?.riskLevel || agentValidator?.riskLevel) === 'high' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            (agentRejection?.riskLevel || agentValidator?.riskLevel) === 'critical' ? 'bg-red-600/20 text-red-400 border border-red-600/30' :
                            'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}>
                            {(agentRejection?.riskLevel || agentValidator?.riskLevel)} RISK
                          </span>
                        )}
                      </div>
                  </div>

                  {/* Developer card - memo + dev account + contract */}
                  {(schedule?.memo || schedule?.creator_account_id || (transactionInfo.details.accounts && transactionInfo.details.accounts.length > 0)) && (
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-4">
                      {schedule?.memo && (
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Developer Memo</label>
                          <p className="text-sm font-medium">{schedule.memo}</p>
                        </div>
                      )}
                      {schedule?.creator_account_id && (
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Dev Account</label>
                          <a
                            href={`https://hashscan.io/testnet/account/${schedule.creator_account_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-mono transition-colors"
                          >
                            {schedule.creator_account_id}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                      {transactionInfo.details.accounts && transactionInfo.details.accounts.length > 0 && (
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Contract</label>
                          <div className="flex flex-wrap gap-2">
                            {transactionInfo.details.accounts.map((account: string, idx: number) => (
                              <a
                                key={idx}
                                href={`https://hashscan.io/testnet/account/${account}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-mono transition-colors"
                              >
                                {account}
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                    <div>
                      <button
                        type="button"
                        onClick={() => setTechnicalDetailsExpanded((v) => !v)}
                        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                      >
                        <svg className={`w-4 h-4 transition-transform ${technicalDetailsExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Technical Details
                      </button>
                      {technicalDetailsExpanded && (
                        <div className="mt-3 space-y-3">
                          {transactionInfo.details.hex && (
                            <div>
                              <span className="text-xs text-muted-foreground block mb-1">Protobuf Hex</span>
                              <div className="bg-muted/40 rounded-xl p-3 overflow-x-auto">
                                <pre className="text-[10px] font-mono text-emerald-500">
                                  {transactionInfo.details.hex}
                                </pre>
                              </div>
                            </div>
                          )}
                          {transactionInfo.details.raw && (
                            <div>
                              <span className="text-xs text-muted-foreground block mb-1">Base64 Encoded</span>
                              <div className="bg-muted/40 rounded-xl p-3 overflow-x-auto">
                                <pre className="text-[10px] font-mono break-all whitespace-pre-wrap text-slate-400">
                                  {transactionInfo.details.raw}
                                </pre>
                              </div>
                            </div>
                          )}
                          {!transactionInfo.details.hex && !transactionInfo.details.raw && (
                            <div className="bg-muted/40 rounded-xl p-4 overflow-x-auto">
                              <pre className="text-xs font-mono whitespace-pre-wrap">
                                {JSON.stringify(transactionInfo.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Future: Contract Analysis */}
            {transactionInfo?.type === 'Contract Update' && (
              <div className="bg-primary/10 rounded-2xl p-6">
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  🔮 Future Feature: Contract Analysis
                </h3>
                <p className="text-sm mb-3">
                  In the future, this section will show:
                </p>
                <ul className="text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">→</span>
                    <span>Side-by-side comparison of old vs new contract code</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">→</span>
                    <span>Security audit results</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">→</span>
                    <span>List of changed functions and permissions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">→</span>
                    <span>Risk assessment and recommendations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">→</span>
                    <span>Community comments and reviews</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Validator Agent Review - from PROJECT_VALIDATOR_TOPIC when agent signed */}
            {!isExecuted && agentValidator && !agentRejection && (
              <div className={`bg-gradient-to-br ${
                agentValidator.riskLevel === 'low' ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30' :
                agentValidator.riskLevel === 'medium' ? 'from-amber-500/10 to-amber-500/5 border-amber-500/30' :
                agentValidator.riskLevel === 'high' ? 'from-rose-500/10 to-rose-500/5 border-rose-500/30' :
                agentValidator.riskLevel === 'critical' ? 'from-red-600/10 to-red-600/5 border-red-600/30' :
                'from-primary/10 to-primary/5 border-primary/30'
              } backdrop-blur-sm rounded-2xl overflow-hidden border-2 shadow-lg`}>
                <div className="px-6 py-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      agentValidator.riskLevel === 'low' ? 'bg-emerald-500/20 text-emerald-500' :
                      agentValidator.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-500' :
                      agentValidator.riskLevel === 'high' ? 'bg-rose-500/20 text-rose-500' :
                      agentValidator.riskLevel === 'critical' ? 'bg-red-600/20 text-red-600' :
                      'bg-primary/20 text-primary'
                    }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-lg font-bold">Validator Agent Review</h3>
                        {agentValidator.riskLevel && (
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full uppercase ${
                            agentValidator.riskLevel === 'low' ? 'bg-emerald-500/20 text-emerald-500' :
                            agentValidator.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-500' :
                            agentValidator.riskLevel === 'high' ? 'bg-rose-500/20 text-rose-500' :
                            'bg-red-600/20 text-red-600'
                          }`}>
                            {agentValidator.riskLevel} risk
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">
                        {agentValidator.recommendation}
                      </p>
                      {agentValidator.functionName && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Function: <code className="bg-muted/60 px-1 py-0.5 rounded">{agentValidator.functionName}</code>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Rejection - when agent rejected, show in left column for prominence */}
            {!isExecuted && agentRejection && (
              <div className="bg-gradient-to-br from-red-600/10 to-red-600/5 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-red-600/30 shadow-lg">
                <div className="px-6 py-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-lg font-bold text-red-400">Agent Rejection</h3>
                        {agentRejection.riskLevel && (
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full uppercase ${
                            agentRejection.riskLevel === 'critical' ? 'bg-red-600 text-white' :
                            agentRejection.riskLevel === 'high' ? 'bg-orange-600 text-white' :
                            'bg-amber-600 text-white'
                          }`}>
                            {agentRejection.riskLevel} risk
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">
                        {agentRejection.reason}
                      </p>
                      {agentRejection.functionName && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Function: <code className="bg-muted/60 px-1 py-0.5 rounded">{agentRejection.functionName}</code>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sign Transaction Button */}
            {!isExecuted && (
              <div className="bg-gradient-to-r from-primary/5 to-primary-dark/5 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-primary/30 shadow-lg">
                <div className="px-6 py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold mb-1">Ready to Sign?</h3>
                      <p className="text-sm text-muted-foreground">
                        Review the transaction details above, then sign with your wallet
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowRejectForm(!showRejectForm)}
                        disabled={signing || !accountId}
                        className="px-6 py-4 bg-muted/40 hover:bg-red-500/20 border border-muted hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-foreground hover:text-red-500 font-bold rounded-xl transition-all"
                      >
                        {showRejectForm ? 'Cancel' : 'Reject'}
                      </button>
                      <button
                        onClick={approveSchedule}
                        disabled={signing || !accountId}
                        className="px-8 py-4 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105 transform"
                      >
                        {signing ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Signing...
                          </span>
                        ) : !accountId ? (
                          'Connect Wallet'
                        ) : (
                          'Sign Transaction'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rejection Feedback Form */}
            {!isExecuted && showRejectForm && (
              <div className="bg-muted/20 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-red-500/30 shadow-lg">
                <div className="px-6 py-6">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-lg font-bold text-red-500">Rejection Feedback</h3>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    Explain your concerns to other signers and the project team. Your rejection will be posted on-chain to the threshold list's rejection topic for transparency.
                  </p>

                  <textarea
                    value={rejectionFeedback}
                    onChange={(e) => setRejectionFeedback(e.target.value)}
                    placeholder="Example: The token mint amount seems unusually high. Can we get more details on the distribution plan before approving?"
                    className="w-full min-h-[120px] px-4 py-3 bg-muted/40 border border-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 resize-y"
                    disabled={submittingRejection}
                  />

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-muted-foreground">
                      💡 Tip: Be specific about your concerns - this helps the team address issues faster
                    </p>
                    <button
                      onClick={submitRejectionToHCS}
                      disabled={submittingRejection || !rejectionFeedback.trim()}
                      className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500 border border-red-500/50 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-red-500 hover:text-white font-bold rounded-lg transition-all"
                    >
                      {submittingRejection ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </span>
                      ) : (
                        'Submit Rejection'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Signatures & Info */}
          <div className="space-y-6">
            <div className="bg-muted/20 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm sticky top-6">
              {/* Signatures */}
              <div className="px-6 py-5">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-5">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Signatures
                </h2>
                {schedule.signatures && schedule.signatures.length > 0 ? (
                  <div className="space-y-3">
                    {schedule.signatures.map((sig, index: number) => {
                      const agentPublicKey = process.env.NEXT_PUBLIC_VALIDATION_AGENT_PUBLIC_KEY;
                      let isAgent = false;
                      if (agentPublicKey) {
                        try {
                          const sigKeyHex = Buffer.from(sig.public_key_prefix, 'base64').toString('hex');
                          const sigKeyRaw = sigKeyHex.length > 64 ? sigKeyHex.slice(-64) : sigKeyHex;
                          const agentKeyRaw = agentPublicKey.length > 64 ? agentPublicKey.slice(-64) : agentPublicKey;
                          isAgent = sigKeyRaw === agentKeyRaw || sigKeyHex.includes(agentKeyRaw) || agentKeyRaw.includes(sigKeyRaw);
                        } catch {
                          // ignore
                        }
                      }
                      const isExpanded = expandedSigIndex === index;
                      return (
                      <div key={index} className={`p-4 rounded-xl ${isAgent ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-muted/30'}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            {!isAgent && <p className="text-sm font-bold">Signature {index + 1}</p>}
                            <p className="text-sm font-medium text-muted-foreground">
                              {new Date(parseFloat(sig.consensus_timestamp) * 1000).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAgent && (
                              <span className="text-xs bg-purple-500/30 text-purple-300 font-semibold px-2 py-1 rounded-full">
                                Validator Agent
                              </span>
                            )}
                            <span className="text-xs bg-green-500/20 text-green-500 font-semibold px-2 py-1 rounded-full">
                              {sig.type}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedSigIndex(isExpanded ? null : index)}
                          className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          {isExpanded ? 'Hide' : 'Show'} key & signature
                        </button>
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-muted/50 space-y-2 text-xs">
                            <div>
                              <span className="text-muted-foreground font-semibold block mb-1">Public Key Prefix</span>
                              <p className="font-mono bg-muted/40 p-2 rounded break-all text-[10px]">
                                {sig.public_key_prefix}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-semibold block mb-1">Signature</span>
                              <p className="font-mono bg-muted/40 p-2 rounded break-all text-[10px] leading-relaxed">
                                {sig.signature}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground">No signatures yet</p>
                  </div>
                )}
              </div>

              {/* Rejections (Agent + HCS Messages) */}
              {(thresholdListData || agentRejection) && (
                <div className="px-6 py-5 pt-8 border-t border-muted/30">
                  <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Rejections
                  </h2>

                  {agentRejection && (
                    <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 font-bold flex-shrink-0">
                          !
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-red-400">Agent Rejection</span>
                            {agentRejection.riskLevel && (
                              <span className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${
                                agentRejection.riskLevel === 'critical' ? 'bg-red-600 text-white' :
                                agentRejection.riskLevel === 'high' ? 'bg-orange-600 text-white' :
                                'bg-amber-600 text-white'
                              }`}>
                                {agentRejection.riskLevel} Risk
                              </span>
                            )}
                          </div>
                          {agentRejection.functionName && (
                            <div className="text-xs text-muted-foreground mb-1">
                              Function: <code className="bg-muted/60 px-1 py-0.5 rounded">{agentRejection.functionName}</code>
                            </div>
                          )}
                          <p className="text-sm text-red-200 leading-relaxed">{agentRejection.reason}</p>
                          <div className="text-xs text-muted-foreground mt-2">Rejected by: {agentRejection.reviewer}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {loadingMessages ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="text-xs text-muted-foreground mt-2">Loading rejection history...</p>
                    </div>
                  ) : hcsMessages.length > 0 ? (
                    <div className="space-y-3">
                      {hcsMessages.map((msg, index) => {
                        let parsedMessage;
                        try {
                          parsedMessage = JSON.parse(msg.message);
                        } catch (e) {
                          parsedMessage = { message: msg.message };
                        }

                        const isRejection = parsedMessage.type === 'rejection' || parsedMessage.reason;
                        const displayReason = parsedMessage.reason || parsedMessage.feedback || parsedMessage.message;
                        const displaySigner = parsedMessage.reviewer || parsedMessage.signer || 'Signer';

                        return (
                          <div key={index} className={`p-4 rounded-xl ${isRejection ? 'bg-red-500/10 border border-red-500/30' : 'bg-muted/30'}`}>
                            <div className="flex items-start gap-3 mb-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isRejection ? 'bg-red-500/20' : 'bg-primary/20'}`}>
                                <svg className={`w-4 h-4 ${isRejection ? 'text-red-500' : 'text-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {isRejection ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                  )}
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <p className="text-sm font-bold">
                                    {typeof displaySigner === 'string' && displaySigner.length > 12 ? `${displaySigner.substring(0, 12)}...` : displaySigner}
                                  </p>
                                  {isRejection && (
                                    <span className="text-xs bg-red-500/20 text-red-500 font-semibold px-2 py-0.5 rounded-full">
                                      Rejected
                                    </span>
                                  )}
                                  {parsedMessage.riskLevel && (
                                    <span className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${
                                      parsedMessage.riskLevel === 'critical' ? 'bg-red-600/80 text-white' :
                                      parsedMessage.riskLevel === 'high' ? 'bg-orange-600/80 text-white' :
                                      'bg-amber-600/80 text-white'
                                    }`}>
                                      {parsedMessage.riskLevel}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(msg.consensusTimestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm mt-2 leading-relaxed">
                              {displayReason}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-muted-foreground">No rejections</p>
                      <p className="text-xs text-muted-foreground mt-1">Signer concerns will appear here</p>
                    </div>
                  )}

                  {thresholdListData?.hcs_topic_id && (
                    <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-red-500">Rejection Topic:</span> {thresholdListData.hcs_topic_id}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Rejection feedback is posted on-chain for transparency
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Schedule Details */}
              <div className="px-6 py-5 pt-8">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Schedule Details
                </h2>
                
                {/* Title */}
                <div className="mb-4 pb-2">
                  <p className="text-base font-semibold">{schedule.memo || 'Untitled Transaction'}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">{schedule.schedule_id}</p>
                </div>

                {/* Condensed grid */}
                <div className="grid grid-cols-1 gap-y-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Fee Payer</span>
                    <p className="font-mono text-xs mt-0.5">{schedule.payer_account_id}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Created</span>
                    <p className="text-xs mt-0.5">{new Date(parseFloat(schedule.consensus_timestamp) * 1000).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Expires</span>
                    <p className="text-xs mt-0.5">{new Date(parseFloat(schedule.expiration_time) * 1000).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Wait for Expiry</span>
                    <p className="text-xs mt-0.5">{schedule.wait_for_expiry ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Admin Key</span>
                    <p className="text-xs mt-0.5">{schedule.admin_key ? 'Present' : 'None'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="bg-muted/20 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-5">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  External Links
                </h2>
                <div className="space-y-2">
                <a
                  href={`https://hashscan.io/testnet/schedule/${schedule.schedule_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                    className="block text-sm text-primary hover:text-primary-dark font-semibold bg-muted/30 hover:bg-muted/40 p-3 rounded-xl transition-colors"
                >
                  View on HashScan →
                </a>
                <a
                  href={`${mirrorNodeUrl}/api/v1/schedules/${schedule.schedule_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                    className="block text-sm text-primary hover:text-primary-dark font-semibold bg-muted/30 hover:bg-muted/40 p-3 rounded-xl transition-colors"
                >
                  View Mirror Node Data →
                </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

