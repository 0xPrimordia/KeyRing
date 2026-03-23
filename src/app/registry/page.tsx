'use client';

import Link from "next/link";
import Header from '../../components/Header';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Signer {
  id: string;
  codeName: string;
  status: 'pending' | 'verified' | 'suspended' | 'revoked';
  verifiedAt: string;
  reputation: string;
  totalLists: number;
  totalTransactions: number;
  totalEarnings: string;
  responseRate: string;
  avgResponseTime: string;
  profileTopicId: string;
  verificationProvider: string;
  createdAt: string;
  listsJoined: unknown[];
  recentActivity: unknown[];
  metadata: {
    transactionCount: number;
    contractInteractions: string;
    mostActiveHours: string;
  };
  accountType?: 'hedera' | 'ethereum';
  walletAddress?: string;
  accountId?: string;
}

interface ThresholdListMember {
  signerId: string;
  codeName: string;
  accountId: string;
  joinedAt: string;
  status: string;
}

interface ThresholdList {
  id: string;
  name: string;
  accountId: string;
  threshold: number;
  totalMembers: number;
  activeMembers: number;
  status: string;
  createdAt: string;
  members: ThresholdListMember[];
  reliability: number;
  avgTenure: number;
}

interface Project {
  id: string;
  company_name: string;
  legal_entity_name: string;
  public_record_url: string | null;
  owners: string[] | null;
  topic_message_id: string | null;
  created_at: string;
  updated_at: string;
  threshold_lists_count?: number;
}

interface ScheduleHistoryItem {
  id: string;
  schedule_id: string;
  project_name: string;
  memo: string | null;
  payer_account_id: string | null;
  creator_account_id: string | null;
  status: 'pending' | 'executed' | 'expired' | 'deleted';
  expiration_time: string | null;
  executed_at: string | null;
  signature_count: number;
  threshold_required: number;
  created_at: string;
}

// Helper function to get status styling
const getStatusStyling = (status: 'pending' | 'verified' | 'suspended' | 'revoked') => {
  switch (status) {
    case 'verified':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'suspended':
      return 'bg-orange-100 text-orange-800';
    case 'revoked':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const VALID_TABS = ['signers', 'lists', 'projects', 'schedules'] as const;

export default function RegistryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const initialTab = VALID_TABS.includes(tabParam as typeof VALID_TABS[number]) ? tabParam! : 'signers';
  const [activeTab, setActiveTabState] = useState(initialTab);
  const [signers, setSigners] = useState<Signer[]>([]);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    router.replace(`/registry?tab=${tab}`, { scroll: false });
  };
  const [thresholdLists, setThresholdLists] = useState<ThresholdList[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scheduleHistory, setScheduleHistory] = useState<ScheduleHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (activeTab === 'signers') {
          const response = await fetch('/api/signers');
          const data = await response.json();
          
          if (data.success) {
            setSigners(data.signers);
            setError(null);
          } else {
            setError(data.error);
          }
        } else if (activeTab === 'lists') {
          const response = await fetch('/api/threshold-lists');
          const data = await response.json();
          
          if (data.success) {
            setThresholdLists(data.lists);
            setError(null);
          } else {
            setError(data.error);
          }
        } else if (activeTab === 'projects') {
          const response = await fetch('/api/projects');
          const data = await response.json();
          
          if (data.success) {
            setProjects(data.projects);
            setError(null);
          } else {
            setError(data.error);
          }
        } else if (activeTab === 'schedules') {
          const response = await fetch('/api/schedule-history');
          const data = await response.json();
          
          if (data.success) {
            setScheduleHistory(data.schedules);
            setError(null);
          } else {
            setError(data.error);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Signer Registry</h2>
          <p className="text-gray-400">Search and verify threshold signers and certified lists</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by public key, account ID, code name, or list ID..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button className="absolute right-3 top-3 text-gray-400 hover:text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button 
                onClick={() => setActiveTab('signers')}
                className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'signers'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-foreground hover:border-gray-300'
                }`}
              >
                Signers
              </button>
              <button 
                onClick={() => setActiveTab('lists')}
                className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'lists'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-foreground hover:border-gray-300'
                }`}
              >
                Multi-Sig Lists
              </button>
              <button 
                onClick={() => setActiveTab('projects')}
                className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'projects'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-foreground hover:border-gray-300'
                }`}
              >
                Projects
              </button>
              <button 
                onClick={() => setActiveTab('schedules')}
                className={`border-b-2 py-2 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'schedules'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-foreground hover:border-gray-300'
                }`}
              >
                Schedule History
              </button>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'projects' ? (
          /* Projects Section */
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-foreground">Registered Projects</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
                <span className="text-gray-400">Loading projects...</span>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <span className="text-red-400">{error}</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-gray-400">No projects found</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {projects.map((project) => (
                  <Link 
                    key={project.id} 
                    href={`/project/${project.id}`}
                    className="bg-gray-700 rounded-lg p-6 border border-gray-600 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 block"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                          {project.company_name}
                        </h3>
                        <div className="text-xs text-gray-400">{project.legal_entity_name}</div>
                      </div>
                      {project.topic_message_id && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                          ✓ On-Chain
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm mb-4">
                      {project.owners && project.owners.length > 0 && (
                        <div>
                          <span className="text-gray-400 text-xs">Owners:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {project.owners.map((owner, idx) => (
                              <span key={idx} className="inline-block px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded">
                                {owner}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {project.threshold_lists_count !== undefined && (
                        <div className="flex justify-between pt-2 border-t border-gray-600">
                          <span className="text-gray-400">Threshold Lists:</span>
                          <span className="text-foreground font-medium">{project.threshold_lists_count}</span>
                        </div>
                      )}
                    </div>

                    {project.public_record_url && (
                      <a 
                        href={project.public_record_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:text-primary-dark transition-colors flex items-center mt-4"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Public Records
                      </a>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-gray-600 text-xs text-gray-400">
                      Registered {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'signers' ? (
          /* Signers Table */
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-foreground">Active Signers</h3>
            </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Code Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Lists Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Reputation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
                        <span className="text-gray-400">Loading signers...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <span className="text-red-400">{error}</span>
                    </td>
                  </tr>
                ) : signers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <span className="text-gray-400">No signers found</span>
                    </td>
                  </tr>
                ) : (
                  signers.map((signer) => (
                    <tr key={signer.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/signer/${signer.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                          {signer.codeName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {signer.accountType === 'ethereum' ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 2L3 10l7 4 7-4-7-8z"/>
                              <path d="M10 16l-7-4 7 6 7-6-7 4z"/>
                            </svg>
                            Ethereum
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                            Hedera
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyling(signer.status)}`}>
                          {signer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {signer.totalLists}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(signer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-400 italic">Not yet determined</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        ) : activeTab === 'lists' ? (
          /* Multi-Sig Lists Section */
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-foreground">Certified Multi-Sig Lists</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
                <span className="text-gray-400">Loading multi-sig lists...</span>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <span className="text-red-400">{error}</span>
              </div>
            ) : thresholdLists.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-gray-400">No multi-sig lists found</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {thresholdLists.map((list) => (
                  <div key={list.id} className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <Link href={`/list/${list.id}`} className="text-lg font-semibold text-foreground hover:text-primary transition-colors">
                        {list.name}
                      </Link>
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary">
                        ✓ Certified
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Threshold:</span>
                        <span className="text-foreground">{list.threshold} of {list.totalMembers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Members:</span>
                        <span className="text-foreground">{list.activeMembers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Reliability:</span>
                        <span className="text-foreground">{list.reliability}%</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <div className="text-xs text-gray-400 mb-2">Members:</div>
                      <div className="flex flex-wrap gap-1">
                        {list.members.slice(0, 3).map((member, idx) => (
                          <span key={idx} className="inline-block px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded">
                            {member.codeName}
                          </span>
                        ))}
                        {list.members.length > 3 && (
                          <span className="inline-block px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded">
                            +{list.members.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Schedule History Section */
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-foreground">Schedule History</h3>
              <p className="text-sm text-gray-400 mt-1">Pending and completed scheduled transactions</p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
                <span className="text-gray-400">Loading schedule history...</span>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <span className="text-red-400">{error}</span>
              </div>
            ) : scheduleHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-2">No schedule history found</div>
                <p className="text-sm text-gray-500">Schedules will appear here once signers begin signing transactions.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Schedule ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Memo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Signatures
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Expiration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {scheduleHistory.map((schedule) => (
                      <tr key={schedule.id} className="hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/signer-dashboard/schedule/${schedule.schedule_id}`}
                            className="text-sm font-mono text-primary hover:text-primary/80 transition-colors"
                          >
                            {schedule.schedule_id}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-foreground">{schedule.project_name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-300 truncate block max-w-[200px]" title={schedule.memo || ''}>
                            {schedule.memo || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            schedule.status === 'executed'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : schedule.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : schedule.status === 'expired'
                              ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {schedule.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-300">
                            {schedule.signature_count}
                            {schedule.threshold_required > 0 && ` / ${schedule.threshold_required}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {schedule.expiration_time
                            ? new Date(schedule.expiration_time).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(schedule.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

