'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import { useWallet } from '../../providers/WalletProvider';
import {
  CreateThresholdListForm,
  CreateThresholdListFormData,
} from '../../components/CreateThresholdListForm';

interface ThresholdList {
  id: string;
  hcsTopicId: string;
  thresholdAccountId: string;
  status: string;
  createdAt: string;
  threshold?: number;
  totalKeys?: number;
}

interface OperatorProject {
  id: string;
  companyName: string;
  legalEntityName: string;
  publicRecordUrl?: string;
  owners?: string[];
  transactionId: string;
  consensusTimestamp: string;
  metadata: Record<string, unknown>;
  thresholdLists: ThresholdList[];
}

export default function ProjectDashboardPage() {
  const { isConnected, connection } = useWallet();
  const [projects, setProjects] = useState<OperatorProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingList, setCreatingList] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFormProject, setCreateFormProject] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const operatorAccountId =
    process.env.NEXT_PUBLIC_OPERATOR_ACCOUNT_ID || '';
  const accountId =
    connection?.type === 'hedera' ? connection.accountId : null;
  const isOperator = !!(
    operatorAccountId &&
    accountId &&
    accountId === operatorAccountId
  );

  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  const explorerBase =
    network === 'mainnet'
      ? 'https://hashscan.io/mainnet'
      : 'https://hashscan.io/testnet';

  useEffect(() => {
    if (!isOperator || !accountId) {
      setLoading(false);
      return;
    }

    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/operator/projects?accountId=${encodeURIComponent(accountId)}`
        );
        const data = await res.json();

        if (data.success) {
          setProjects(data.projects || []);
        } else {
          setError(data.error || 'Failed to load projects');
        }
      } catch (err) {
        console.error('Error fetching operator projects:', err);
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [isOperator, accountId]);

  const handleOpenCreateForm = (projectId: string, projectName: string) => {
    setCreateFormProject({
      id: projectId !== 'standalone' ? projectId : 'standalone',
      name: projectName,
    });
    setCreateError(null);
  };

  const handleCreateThresholdList = async (formData: CreateThresholdListFormData) => {
    if (!accountId || !createFormProject) return;

    setCreatingList(createFormProject.id);
    setCreateError(null);

    try {
      const res = await fetch('/api/threshold-lists/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          projectId:
            createFormProject.id !== 'standalone' ? createFormProject.id : undefined,
          threshold: formData.threshold,
          signerPublicKeys: formData.signerPublicKeys,
          includePassiveAgents: formData.includePassiveAgents,
          includeValidatorAgent: formData.includeValidatorAgent,
          initialBalanceHbar: formData.initialBalanceHbar,
          memo: formData.memo,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setCreateFormProject(null);
        const refreshRes = await fetch(
          `/api/operator/projects?accountId=${encodeURIComponent(accountId)}`
        );
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setProjects(refreshData.projects || []);
        }
      } else {
        setCreateError(data.error || 'Failed to create threshold list');
      }
    } catch (err) {
      console.error('Error creating threshold list:', err);
      setCreateError('Failed to create threshold list');
    } finally {
      setCreatingList(null);
    }
  };

  if (!isConnected || connection?.type !== 'hedera') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Project Dashboard
            </h1>
            <p className="text-gray-400 mb-6">
              Connect your Hedera wallet to access the project dashboard.
            </p>
            <Link
              href="/"
              className="text-primary hover:text-primary-dark transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isOperator) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Project Dashboard
            </h1>
            <p className="text-gray-400 mb-6">
              This dashboard is for project operators. Your connected wallet (
              {accountId}) is not the configured operator account.
            </p>
            <Link
              href="/signer-dashboard"
              className="text-primary hover:text-primary-dark transition-colors"
            >
              Go to Signer Dashboard →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mr-3" />
            <span className="text-gray-400">Loading your projects...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Project Dashboard
          </h1>
          <p className="text-gray-400">
            Your projects registered on the HCS topic and their threshold
            lists.
          </p>
        </div>

        {createError && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
            {createError}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
            {error}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl p-12 border border-gray-700 text-center">
            <p className="text-gray-400 mb-4">
              No projects found for your operator account on the registry topic.
            </p>
            <p className="text-sm text-gray-500">
              Register a project via the HCS project registry topic to see it
              here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden"
              >
                <div className="px-8 py-6 border-b border-gray-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        {project.companyName}
                      </h2>
                      <p className="text-gray-400 mt-1">
                        {project.legalEntityName}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                      On-Chain
                    </span>
                  </div>
                  {project.owners && project.owners.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {project.owners.map((owner, idx) => (
                        <span
                          key={idx}
                          className="inline-flex px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded-lg border border-gray-600"
                        >
                          {owner}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                      Threshold Lists
                    </h3>
                    <button
                      onClick={() =>
                        handleOpenCreateForm(
                          /^[0-9a-f-]{36}$/i.test(project.id)
                            ? project.id
                            : 'standalone',
                          project.companyName
                        )
                      }
                      disabled={!!creatingList}
                      className="px-4 py-2 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + Create Threshold List
                    </button>
                  </div>

                  {project.thresholdLists.length === 0 ? (
                    <div className="text-center py-8 bg-gray-700/30 rounded-lg border border-gray-600">
                      <p className="text-gray-400 mb-4">
                        No threshold lists yet for this project.
                      </p>
                      <button
                        onClick={() =>
                          handleOpenCreateForm(
                            /^[0-9a-f-]{36}$/i.test(project.id)
                              ? project.id
                              : 'standalone',
                            project.companyName
                          )
                        }
                        disabled={!!creatingList}
                        className="text-primary hover:text-primary-dark font-medium"
                      >
                        Create your first threshold list
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {project.thresholdLists.map((list) => (
                        <div
                          key={list.id}
                          className="bg-gray-700 rounded-lg p-6 border border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span className="font-semibold text-foreground font-mono text-sm">
                              {list.thresholdAccountId}
                            </span>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                list.status === 'active'
                                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                  : 'bg-gray-500/20 text-gray-300'
                              }`}
                            >
                              {list.status}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm">
                            {list.threshold != null &&
                              list.totalKeys != null && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">
                                    Threshold:
                                  </span>
                                  <span className="text-foreground">
                                    {list.threshold} of {list.totalKeys}
                                  </span>
                                </div>
                              )}
                            {list.hcsTopicId && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">HCS Topic:</span>
                                <span
                                  className="text-foreground font-mono text-xs truncate max-w-[100px]"
                                  title={list.hcsTopicId}
                                >
                                  {list.hcsTopicId}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-400">Created:</span>
                              <span className="text-foreground">
                                {new Date(list.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <a
                            href={`${explorerBase}/account/${list.thresholdAccountId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center text-xs text-primary hover:text-primary-dark"
                          >
                            View on HashScan →
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {createFormProject && (
          <CreateThresholdListForm
            projectId={createFormProject.id}
            projectName={createFormProject.name}
            onClose={() => setCreateFormProject(null)}
            onSubmit={handleCreateThresholdList}
            isSubmitting={!!creatingList}
          />
        )}

        <div className="mt-8">
          <Link
            href="/"
            className="text-gray-400 hover:text-primary transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
