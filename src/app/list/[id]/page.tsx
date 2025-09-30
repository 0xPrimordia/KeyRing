import Link from "next/link";
import mockData from "@/data/mockData.json";
import Header from '@/components/Header';

interface ThresholdListPageProps {
  params: {
    id: string;
  };
}

export default function ThresholdListPage({ params }: ThresholdListPageProps) {
  const list = mockData.thresholdLists.find(l => l.id === params.id);

  if (!list) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Threshold List Not Found</h1>
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
                <span className="text-foreground text-sm font-medium">{list.name}</span>
              </li>
            </ol>
          </nav>
        </div>

        {/* Header Section */}
        <div className="bg-gray-800 rounded-2xl p-8 mb-8 border border-gray-700">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center mb-4">
                <h1 className="text-3xl font-bold text-foreground mr-4">{list.name}</h1>
                {list.certified && (
                  <span className="inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full bg-primary/20 text-primary">
                    ✓ KeyRing Certified
                  </span>
                )}
              </div>
              <p className="text-gray-300 mb-4">{list.description}</p>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-400">Certified {new Date(list.certifiedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-gray-400">Last activity {new Date(list.lastActivity).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary mb-1">{list.threshold} of {list.totalMembers}</div>
              <div className="text-sm text-gray-400">Threshold</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-primary mb-1">{list.reliability}%</div>
              <div className="text-xs text-gray-400">Reliability</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-primary mb-1">{list.avgTenure}</div>
              <div className="text-xs text-gray-400">Avg Tenure</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-primary mb-1">{list.totalTransactions}</div>
              <div className="text-xs text-gray-400">Total Transactions</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-primary mb-1">{list.members.filter(m => m.status === 'active').length}</div>
              <div className="text-xs text-gray-400">Active Signers</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Signers List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-foreground mb-6">Threshold Signers</h2>
              <div className="space-y-4">
                {list.members.map((member) => (
                  <div key={member.signerId} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <Link href={`/signer/${member.signerId}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                          {member.codeName}
                        </Link>
                        <div className="text-sm text-gray-400">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">{member.reputation}%</div>
                        <div className="text-xs text-gray-400">Reputation</div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        member.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Info */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-foreground mb-4">Project Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-400">Token Address</div>
                  <div className="text-sm text-foreground font-mono">{list.tokenAddress}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Contract Address</div>
                  <div className="text-sm text-foreground font-mono">{list.contractAddress}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Website</div>
                  <a href={list.projectWebsite} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:text-primary-dark">
                    {list.projectWebsite}
                  </a>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-foreground mb-4">Recent Transactions</h3>
              <div className="space-y-4">
                {list.recentTransactions.map((tx) => (
                  <div key={tx.id} className="border-l-4 border-primary pl-4">
                    <div className="text-sm font-semibold text-foreground">{tx.type}</div>
                    <div className="text-xs text-gray-400 mb-2">{tx.description}</div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-green-400">✓ {tx.approvals}</span>
                        <span className="text-xs text-red-400">✗ {tx.rejections}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
