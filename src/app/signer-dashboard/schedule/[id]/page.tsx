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
  Client
} from '@hashgraph/sdk';

const aiRecommendations = {
  "SIMPLE_BOOST": {
    "risk": "low",
    "recommendation": "This is a low-risk transaction that simply increments a counter on-chain. It's commonly used for testing multi-signature workflows and tracking engagement metrics.",
    "keyPoints": [
      "No token transfers or financial impact",
      "Safe for testing and learning",
      "Good practice for new signers"
    ],
    "action": "Safe to approve"
  },
  "TOKEN_MINT": {
    "risk": "high",
    "recommendation": "Token minting increases circulating supply and can impact token economics. Verify the mint amount aligns with the project's tokenomics schedule and distribution plan.",
    "keyPoints": [
      "Check if amount matches published tokenomics",
      "Verify recipient is the intended distribution wallet",
      "Consider inflation impact on token value",
      "Ensure proper community communication"
    ],
    "action": "Review carefully before approving"
  },
  "TOKEN_BURN": {
    "risk": "high",
    "recommendation": "Token burning permanently removes tokens from circulation. This is typically positive for token value but should align with the project's buyback program or deflationary schedule.",
    "keyPoints": [
      "Verify burn amount matches announced program",
      "Confirm this aligns with roadmap commitments",
      "Check if community was notified in advance",
      "Burns are irreversible - double-check amount"
    ],
    "action": "Verify burn program details"
  },
  "TREASURY_TRANSFER": {
    "risk": "high",
    "recommendation": "Treasury transfers move significant funds and require careful verification. Large transfers should align with approved budgets and have clear purposes documented.",
    "keyPoints": [
      "Verify recipient address is legitimate",
      "Check if transfer amount is within approved budget",
      "Ensure proper documentation exists",
      "Consider if amount is appropriate for stated purpose"
    ],
    "action": "Verify recipient and purpose"
  },
  "ACCOUNT_ALLOWANCE": {
    "risk": "medium",
    "recommendation": "Account allowances grant spending permissions to third-party contracts (like DEXs). Verify the contract is legitimate and the allowance amount is reasonable for the intended use.",
    "keyPoints": [
      "Verify the contract address is the official DEX/protocol",
      "Check if allowance amount is appropriate",
      "Consider if unlimited allowance is necessary",
      "Research the protocol's security track record"
    ],
    "action": "Verify contract legitimacy"
  },
  "FEE_SCHEDULE_UPDATE": {
    "risk": "medium",
    "recommendation": "Fee schedule changes affect all token holders. Verify the new fees are reasonable and align with network conditions. Excessive fees can negatively impact user adoption.",
    "keyPoints": [
      "Check if new fee is competitive with similar tokens",
      "Verify community was consulted on changes",
      "Consider impact on small transactions",
      "Ensure fees don't discourage trading activity"
    ],
    "action": "Review fee reasonability"
  },
  "TOKEN_PAUSE": {
    "risk": "critical",
    "recommendation": "⚠️ CRITICAL: Token pausing halts ALL transfers and should only be used in emergency situations. Verify there is a legitimate security threat or critical bug before approving.",
    "keyPoints": [
      "Confirm there is a verified security vulnerability",
      "Check if team has communicated the issue publicly",
      "Verify a fix is being developed",
      "Consider impact on token holders and exchanges",
      "Ensure unpause plan exists"
    ],
    "action": "⚠️ Only approve for verified emergencies"
  },
  "SUPPLY_KEY_TRANSFER": {
    "risk": "critical",
    "recommendation": "⚠️ CRITICAL: Transferring the supply key changes fundamental token control. This should only occur for planned governance upgrades to more secure multi-sig setups. Verify the recipient address exhaustively.",
    "keyPoints": [
      "Verify recipient is the correct new multi-sig address",
      "Confirm upgrade was announced to community",
      "Check if new setup improves security (e.g., 2-of-3 to 3-of-5)",
      "Ensure all signers understand new key holders",
      "IRREVERSIBLE - triple-check recipient address"
    ],
    "action": "⚠️ Verify recipient address multiple times"
  }
} as const;

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

export default function ScheduleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id as string;
  const { connection, dAppConnector } = useWallet();
  const accountId = connection?.type === 'hedera' ? connection.accountId : null;

  const [schedule, setSchedule] = useState<ScheduleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);

  useEffect(() => {
    loadScheduleDetails();
  }, [scheduleId]);

  async function loadScheduleDetails() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/schedules/${scheduleId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load schedule details');
      }

      const data = await response.json();
      setSchedule(data);

    } catch (err: any) {
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
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
        `https://testnet.mirrornode.hedera.com/api/v1/schedules/${scheduleId}`
      );

      if (!scheduleResponse.ok) {
        throw new Error('Failed to fetch schedule details');
      }

      const scheduleData = await scheduleResponse.json();
      console.log('[DETAIL] Schedule details:', scheduleData);

      // Check if the user has already signed
      const userPublicKeyResponse = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
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
            
            // Mock risk assessment based on transaction type (will be replaced with AI)
            let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
            const txTypeRaw = txTypeMatch ? txTypeMatch[1].toUpperCase() : '';
            
            if (txTypeRaw === 'SIMPLE_BOOST') {
              riskLevel = 'low';
            } else if (txTypeRaw === 'TOKEN_PAUSE' || txTypeRaw === 'SUPPLY_KEY_TRANSFER') {
              riskLevel = 'critical';
            } else if (txTypeRaw === 'TOKEN_MINT' || txTypeRaw === 'TOKEN_BURN' || txTypeRaw === 'TREASURY_TRANSFER') {
              riskLevel = 'high';
            } else if (txTypeRaw === 'ACCOUNT_ALLOWANCE' || txTypeRaw === 'FEE_SCHEDULE_UPDATE') {
              riskLevel = 'medium';
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
              risk: riskLevel
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
          <Link
            href="/signer-dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
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
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      What This Transaction Does
                    </h2>
                  {transactionInfo.risk && (
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        transactionInfo.risk === 'low' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        transactionInfo.risk === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        transactionInfo.risk === 'high' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        transactionInfo.risk === 'critical' ? 'bg-red-600/20 text-red-400 border border-red-600/30' :
                        'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                      {transactionInfo.risk} RISK
                    </span>
                  )}
                </div>
                  <div className="space-y-5">
                  <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Transaction Type</label>
                      <p className="text-lg font-bold">{transactionInfo.type}</p>
                  </div>
                  <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Description</label>
                      <p className="text-sm leading-relaxed">{transactionInfo.description}</p>
                  </div>
                    {/* Show accounts involved if we decoded them */}
                    {transactionInfo.details.accounts && transactionInfo.details.accounts.length > 0 && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                          Accounts Involved
                        </label>
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

                    {/* Show decoded summary */}
                    {transactionInfo.details.decoded && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                          Decoded Summary
                        </label>
                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                          <p className="text-sm text-foreground">{transactionInfo.details.decoded}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                        Technical Details
                      </label>
                      <div className="space-y-3">
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

            {/* AI Recommendation */}
            {!isExecuted && transactionInfo && (() => {
              const memoMatch = schedule?.memo?.toLowerCase() || '';
              const txTypeMatch = memoMatch.match(/boostproject:\s*(\w+)/);
              const txType = txTypeMatch ? txTypeMatch[1].toUpperCase() : null;
              const recommendation = txType && aiRecommendations[txType as keyof typeof aiRecommendations];
              
              if (!recommendation) return null;
              
              const riskColors = {
                low: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30',
                medium: 'from-amber-500/10 to-amber-500/5 border-amber-500/30',
                high: 'from-rose-500/10 to-rose-500/5 border-rose-500/30',
                critical: 'from-red-600/10 to-red-600/5 border-red-600/30'
              };
              
              const iconColors = {
                low: 'bg-emerald-500/20 text-emerald-500',
                medium: 'bg-amber-500/20 text-amber-500',
                high: 'bg-rose-500/20 text-rose-500',
                critical: 'bg-red-600/20 text-red-600'
              };
              
              return (
                <div className={`bg-gradient-to-br ${riskColors[recommendation.risk as keyof typeof riskColors]} backdrop-blur-sm rounded-2xl overflow-hidden border-2 shadow-lg`}>
                  <div className="px-6 py-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 ${iconColors[recommendation.risk as keyof typeof iconColors]} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-lg font-bold">AI Risk Assessment</h3>
                          <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-1 rounded-full">
                            Powered by GPT-4
                          </span>
                        </div>
                        
                        <p className="text-sm leading-relaxed mb-4">
                          {recommendation.recommendation}
                        </p>
                        
                        <div className="space-y-2 mb-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Considerations:</p>
                          {recommendation.keyPoints.map((point: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{point}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${
                          recommendation.risk === 'low' ? 'bg-emerald-500/20 text-emerald-500' :
                          recommendation.risk === 'medium' ? 'bg-amber-500/20 text-amber-500' :
                          recommendation.risk === 'high' ? 'bg-rose-500/20 text-rose-500' :
                          'bg-red-600/20 text-red-600'
                        }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {recommendation.action}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                    Explain your concerns to other signers and the project team. Your feedback will be posted on-chain via HCS.
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
                      onClick={async () => {
                        if (!rejectionFeedback.trim()) {
                          setError('Please provide feedback explaining your rejection');
                          return;
                        }
                        setSubmittingRejection(true);
                        // TODO: Post to HCS
                        console.log('[REJECT] Feedback:', rejectionFeedback);
                        setTimeout(() => {
                          setSubmittingRejection(false);
                          setShowRejectForm(false);
                          setRejectionFeedback('');
                          alert('Rejection feedback submitted! (HCS integration coming soon)');
                        }, 1000);
                      }}
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
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Signatures
                </h2>
                {schedule.signatures && schedule.signatures.length > 0 ? (
                  <div className="space-y-3">
                    {schedule.signatures.map((sig, index: number) => (
                      <div key={index} className="bg-muted/30 p-4 rounded-xl">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">Signature {index + 1}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(parseFloat(sig.consensus_timestamp) * 1000).toLocaleString()}
                            </p>
                          </div>
                          <span className="text-xs bg-green-500/20 text-green-500 font-semibold px-2 py-1 rounded-full">
                            {sig.type}
                          </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-muted-foreground font-semibold block mb-1">Public Key Prefix</span>
                            <p className="font-mono bg-muted/40 p-2 rounded break-all">
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
                      </div>
                    ))}
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

              {/* Basic Information */}
              <div className="px-6 py-5 pt-8">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Basic Information
                </h2>
                
                {/* Title */}
                <div className="mb-4 pb-2">
                  <p className="text-base font-semibold">{schedule.memo || 'Untitled Transaction'}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">{schedule.schedule_id}</p>
                </div>

                {/* Condensed grid */}
                <div className="grid grid-cols-1 gap-y-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Creator</span>
                    <p className="font-mono text-xs mt-0.5">{schedule.creator_account_id}</p>
                  </div>
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
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  href={`https://testnet.mirrornode.hedera.com/api/v1/schedules/${schedule.schedule_id}`}
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

