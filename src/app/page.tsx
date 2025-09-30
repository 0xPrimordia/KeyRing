import Image from "next/image";
import Link from "next/link";
import Header from '../components/Header';

// Mock data for the registry
const mockVerifiers = [
  {
    id: "v1",
    codeName: "crimson-firefly-47",
    status: "Active",
    listsJoined: 3,
    startDate: "2024-01-15",
    reputation: 98,
    accountId: "0.0.123456"
  },
  {
    id: "v2", 
    codeName: "azure-mountain-92",
    status: "Active",
    listsJoined: 5,
    startDate: "2024-02-03",
    reputation: 95,
    accountId: "0.0.234567"
  },
  {
    id: "v3",
    codeName: "golden-river-18",
    status: "Active", 
    listsJoined: 2,
    startDate: "2024-03-12",
    reputation: 100,
    accountId: "0.0.345678"
  },
  {
    id: "v4",
    codeName: "violet-storm-63",
    status: "Active",
    listsJoined: 4,
    startDate: "2024-01-28",
    reputation: 92,
    accountId: "0.0.456789"
  },
  {
    id: "v5",
    codeName: "silver-dawn-29",
    status: "Suspended",
    listsJoined: 1,
    startDate: "2024-04-05",
    reputation: 78,
    accountId: "0.0.567890"
  }
];

const mockThresholdLists = [
  {
    id: "tl1",
    name: "DeFi Protocol Alpha",
    threshold: 3,
    totalMembers: 5,
    certified: true,
    avgTenure: "8 months",
    reliability: 96,
    members: ["crimson-firefly-47", "azure-mountain-92", "golden-river-18", "violet-storm-63", "silver-dawn-29"]
  },
  {
    id: "tl2", 
    name: "NFT Marketplace Beta",
    threshold: 2,
    totalMembers: 3,
    certified: true,
    avgTenure: "6 months", 
    reliability: 98,
    members: ["crimson-firefly-47", "azure-mountain-92", "golden-river-18"]
  },
  {
    id: "tl3",
    name: "DAO Treasury Gamma",
    threshold: 4,
    totalMembers: 7,
    certified: true,
    avgTenure: "5 months",
    reliability: 94,
    members: ["crimson-firefly-47", "azure-mountain-92", "golden-river-18", "violet-storm-63"]
  }
];

export default function RegistryPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Verifier Registry</h2>
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
              <button className="border-b-2 border-primary text-primary py-2 px-1 text-sm font-medium">
                Verifiers
              </button>
              <button className="border-b-2 border-transparent text-gray-400 hover:text-foreground hover:border-gray-300 py-2 px-1 text-sm font-medium">
                Threshold Lists
              </button>
            </nav>
          </div>
        </div>

        {/* Verifiers Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-foreground">Active Verifiers</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Code Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Account ID
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
                {mockVerifiers.map((verifier) => (
                  <tr key={verifier.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/signer/s-00${verifier.id.slice(-1)}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                        {verifier.codeName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        verifier.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {verifier.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      {verifier.accountId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {verifier.listsJoined}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {verifier.startDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-300 mr-2">{verifier.reputation}%</span>
                        <div className="w-16 bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${verifier.reputation}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Threshold Lists Section (hidden by default, would show when tab is clicked) */}
        <div className="hidden mt-8">
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-foreground">Certified Threshold Lists</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {mockThresholdLists.map((list) => (
                <div key={list.id} className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                  <div className="flex items-center justify-between mb-4">
                    <Link href="/list/tl-001" className="text-lg font-semibold text-foreground hover:text-primary transition-colors">
                      {list.name}
                    </Link>
                    {list.certified && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary">
                        ✓ Certified
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Threshold:</span>
                      <span className="text-foreground">{list.threshold} of {list.totalMembers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Tenure:</span>
                      <span className="text-foreground">{list.avgTenure}</span>
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
                          {member}
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
          </div>
        </div>
      </div>
    </div>
  );
}