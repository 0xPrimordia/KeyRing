import Image from "next/image";
import Link from "next/link";
import mockData from "@/data/mockData.json";
import Header from '../../components/Header';

interface SignerPageProps {
  params: {
    id: string;
  };
}

export default function SignerPage({ params }: SignerPageProps) {
  const signer = mockData.signers.find(s => s.id === params.id);

  if (!signer) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Signer Not Found</h1>
          <Link href="/" className="text-primary hover:text-primary-dark">
            Return to Registry
          </Link>
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
                <div className="text-sm text-gray-400 mb-2">Account ID: {signer.accountId}</div>
                <div className="text-sm text-gray-400">
                  Verified {new Date(signer.verifiedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary mb-1">{signer.reputation}%</div>
              <div className="text-sm text-gray-400">Reputation Score</div>
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
              <div className="text-lg font-bold text-primary mb-1">{signer.responseRate}%</div>
              <div className="text-xs text-gray-400">Response Rate</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-primary mb-1">{signer.avgResponseTime}</div>
              <div className="text-xs text-gray-400">Avg Response</div>
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
                {signer.listsJoined.map((list) => (
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
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-foreground mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {signer.recentActivity.map((activity) => (
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
                ))}
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
                  <div className="text-sm text-gray-400">Region</div>
                  <div className="text-sm text-foreground">{signer.metadata.region}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Network Tenure</div>
                  <div className="text-sm text-foreground">{signer.metadata.networkTenure}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Public Key</div>
                  <div className="text-xs font-mono text-gray-300 bg-gray-700 rounded p-2">
                    {signer.publicKey.slice(0, 10)}...{signer.publicKey.slice(-6)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Specializations</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {signer.metadata.specializations.map((spec, index) => (
                      <span key={index} className="inline-block px-2 py-1 text-xs bg-primary/20 text-primary rounded">
                        {spec}
                      </span>
                    ))}
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
                  <div className="text-sm text-gray-400">Contract Interactions</div>
                  <div className="text-sm text-foreground">{signer.metadata.contractInteractions}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Most Active Hours</div>
                  <div className="text-sm text-foreground">{signer.metadata.mostActiveHours}</div>
                </div>
              </div>
            </div>


            {/* Performance Metrics */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-foreground mb-4">Performance</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Response Rate</span>
                    <span className="text-foreground">{signer.responseRate}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${signer.responseRate}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Reputation</span>
                    <span className="text-foreground">{signer.reputation}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${signer.reputation}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
