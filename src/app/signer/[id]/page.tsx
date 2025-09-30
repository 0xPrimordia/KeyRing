'use client';

import Link from "next/link";
import Header from '@/components/Header';
import { useState, useEffect, use } from 'react';

interface ListMembership {
  listId: string;
  listName: string;
  threshold: number;
  totalMembers: number;
  joinedAt: string;
  role: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  status: string;
  transactionType: string;
  listName: string;
  reason?: string;
  rewardAmount?: string;
  reward?: string;
}

interface SignerData {
  id: string;
  codeName: string;
  publicKey: string;
  accountId: string;
  status: string;
  verifiedAt: string;
  verificationStatus: string;
  verificationProvider: string;
  verificationDate: string | null;
  profileTopicId: string;
  createdAt: string;
  reputation: string;
  totalLists: number;
  totalTransactions: number;
  totalEarnings: string;
  responseRate: string;
  avgResponseTime: string;
  listsJoined: ListMembership[];
  recentActivity: ActivityItem[];
  metadata: {
    verificationMethod: string;
    networkTenure: string;
    accountCreated: string;
    transactionCount: number;
    lastTransactionDate: string | null;
    transactionTypes: string[];
    recentTransactions: unknown[];
  };
}

interface SignerPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SignerPage({ params }: SignerPageProps) {
  const resolvedParams = use(params);
  const [signer, setSigner] = useState<SignerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSigner = async () => {
      try {
        const response = await fetch(`/api/signers/${resolvedParams.id}`);
        const data = await response.json();
        
        if (data.success) {
          setSigner(data.signer);
        } else {
          setError(data.error);
        }
      } catch (err) {
        console.error('Error fetching signer:', err);
        setError('Failed to load signer');
      } finally {
        setLoading(false);
      }
    };

    fetchSigner();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
            <span className="text-gray-400">Loading signer...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !signer) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              {error === 'Signer not found' ? 'Signer Not Found' : 'Error Loading Signer'}
            </h1>
            <p className="text-gray-400 mb-6">
              {error === 'Signer not found' 
                ? "The signer you're looking for doesn't exist." 
                : error || 'Failed to load signer data'}
            </p>
            <Link href="/" className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              Back to Registry
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link href="/" className="text-gray-400 hover:text-primary text-sm">Registry</Link>
              </li>
              <li>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li>
                <span className="text-foreground text-sm font-medium">{signer.codeName}</span>
              </li>
            </ol>
          </nav>
        </div>

        {/* Header Section */}
        <div className="bg-gray-800 rounded-2xl p-8 mb-8 border border-gray-700">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mr-6">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <h1 className="text-3xl font-bold text-foreground mr-4">{signer.codeName}</h1>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    signer.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {signer.status}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  Verified {new Date(signer.verifiedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg text-gray-400 italic mb-1">Not yet determined</div>
              <div className="text-sm text-gray-400">Reputation Score</div>
              <div className="text-xs text-gray-500 mt-1">Requires review activity</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-primary mb-1">{signer.totalLists}</div>
              <div className="text-xs text-gray-400">Active Lists</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-primary mb-1">{signer.totalTransactions}</div>
              <div className="text-xs text-gray-400">Total Reviews</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-400 italic mb-1">Not yet determined</div>
              <div className="text-xs text-gray-400">Response Rate</div>
              <div className="text-xs text-gray-500 mt-1">Requires review activity</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-400 italic mb-1">Not yet determined</div>
              <div className="text-xs text-gray-400">Avg Response</div>
              <div className="text-xs text-gray-500 mt-1">Requires review activity</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Threshold Lists */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-foreground mb-6">Threshold Lists</h2>
              <div className="space-y-4">
                {signer.listsJoined.length > 0 ? (
                  signer.listsJoined.map((list) => (
                    <div key={list.listId} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div>
                        <Link href={`/list/${list.listId}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                          {list.listName}
                        </Link>
                        <div className="text-sm text-gray-400">
                          Joined {new Date(list.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-sm text-primary font-semibold capitalize">
                        {list.role}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Threshold Lists Yet</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      This signer hasn&apos;t joined any threshold lists yet. Once they&apos;re added to a list, 
                      they&apos;ll be able to participate in multi-signature transactions and earn rewards.
                    </p>
                    <p className="text-xs text-gray-500">
                      Signers are randomly assigned to threshold lists to ensure decentralization and security.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-foreground mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {signer.recentActivity.length > 0 ? (
                  signer.recentActivity.map((activity) => (
                    <div key={activity.id} className="border-l-4 border-primary pl-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center mb-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mr-3 ${
                              activity.type === 'approval' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {activity.type === 'approval' ? '✓ Approved' : '✗ Rejected'}
                            </span>
                            <span className="text-sm font-semibold text-foreground">{activity.transactionType}</span>
                          </div>
                          <div className="text-sm text-gray-400 mb-1">{activity.listName}</div>
                          {activity.reason && (
                            <div className="text-xs text-gray-500 italic">Reason: {activity.reason}</div>
                          )}
                          <div className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-primary">
                          +{activity.reward}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Activity Yet</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      This signer hasn&apos;t participated in any transaction reviews yet. Once they join 
                      threshold lists and start reviewing transactions, their activity will appear here.
                    </p>
                    <p className="text-xs text-gray-500">
                      Activity includes transaction approvals, rejections, and earned LYNX rewards.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Verification Details */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-foreground mb-4">Verification</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-400">Method</div>
                  <div className="text-sm text-foreground">{signer.metadata.verificationMethod}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Network Tenure</div>
                  <div className="text-sm text-foreground">{signer.metadata.networkTenure}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Public Key</div>
                  <div className="text-xs font-mono text-gray-300 bg-gray-700 rounded p-2">
                    {signer.publicKey}
                  </div>
                </div>
              </div>
            </div>

            {/* On-Chain Activity */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-foreground mb-4">On-Chain Activity</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-400">Account Created</div>
                  <div className="text-sm text-foreground">{new Date(signer.metadata.accountCreated).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Total Transactions</div>
                  <div className="text-sm text-foreground">{signer.metadata.transactionCount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Last Transaction</div>
                  <div className="text-sm text-foreground">
                    {signer.metadata?.lastTransactionDate 
                      ? new Date(signer.metadata.lastTransactionDate).toLocaleDateString()
                      : 'No transactions'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Transaction Types</div>
                  <div className="text-xs text-foreground">{signer.metadata?.transactionTypes || 'None yet'}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
