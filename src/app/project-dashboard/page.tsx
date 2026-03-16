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
  adminDisplay?: string;
  isCurrentAdmin?: boolean;
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
  contractId?: string;
  contractHashscanUrl?: string;
  contracts?: string[];
  adminThresholdAccountId?: string;
  migrationThresholdAccountId?: string;
  migrationScheduleId?: string;
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
  const [operatorPendingSchedules, setOperatorPendingSchedules] = useState<
    Array<{ schedule_id: string; memo: string; payer_account_id: string; expiration_time: string }>
  >([]);
  const [loadingOperatorSchedules, setLoadingOperatorSchedules] = useState(false);
  const [scheduleReviewLoading, setScheduleReviewLoading] = useState(false);
  const [scheduleReviewError, setScheduleReviewError] = useState<string | null>(null);
  const [scheduleReviewSuccess, setScheduleReviewSuccess] = useState<string | null>(null);
  const [operatorCreatedSchedules, setOperatorCreatedSchedules] = useState<
    Array<{ schedule_id: string; memo: string; payer_account_id?: string; expiration_time?: string }>
  >([]);
  const [loadingCreatedSchedules, setLoadingCreatedSchedules] = useState(false);
  const [triggeringScheduleId, setTriggeringScheduleId] = useState<string | null>(null);
  const [setAdminLoading, setSetAdminLoading] = useState<string | null>(null);
  const [setAdminError, setSetAdminError] = useState<string | null>(null);
  const [setAdminSuccess, setSetAdminSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isOperator || !accountId) return;
    const fetchOperatorPending = async () => {
      setLoadingOperatorSchedules(true);
      try {
        const res = await fetch(
          `/api/schedules/pending-for-account?accountId=${encodeURIComponent(accountId)}`
        );
        const data = await res.json();
        if (data.success && data.schedules) {
          setOperatorPendingSchedules(data.schedules);
        }
      } catch {
        setOperatorPendingSchedules([]);
      } finally {
        setLoadingOperatorSchedules(false);
      }
    };
    fetchOperatorPending();
  }, [isOperator, accountId]);

  useEffect(() => {
    if (!isOperator || !accountId) return;
    const fetchCreatedSchedules = async () => {
      setLoadingCreatedSchedules(true);
      try {
        const res = await fetch(
          `/api/schedules/created-by-account?accountId=${encodeURIComponent(accountId)}`
        );
        const data = await res.json();
        if (data.success && data.schedules) {
          setOperatorCreatedSchedules(data.schedules);
        }
      } catch {
        setOperatorCreatedSchedules([]);
      } finally {
        setLoadingCreatedSchedules(false);
      }
    };
    fetchCreatedSchedules();
  }, [isOperator, accountId]);

  // Poll migration status when projects have pending migrations (90s interval - switch takes several minutes)
  useEffect(() => {
    if (!isOperator || !accountId) return;
    const projectsWithMigration = projects.filter(
      (p) =>
        /^[0-9a-f-]{36}$/i.test(p.id) &&
        p.migrationScheduleId &&
        p.migrationThresholdAccountId
    );
    if (projectsWithMigration.length === 0) return;

    const pollMigration = async () => {
      for (const proj of projectsWithMigration) {
        try {
          const res = await fetch(
            `/api/projects/migration-status?projectId=${encodeURIComponent(proj.id)}`
          );
          const data = await res.json();
          if (data.success && data.completed) {
            const refreshRes = await fetch(
              `/api/operator/projects?accountId=${encodeURIComponent(accountId)}`
            );
            const refreshData = await refreshRes.json();
            if (refreshData.success) setProjects(refreshData.projects || []);
            return;
          }
        } catch {
          // Ignore poll errors
        }
      }
    };

    pollMigration();
    const interval = setInterval(pollMigration, 90_000);
    return () => clearInterval(interval);
  }, [isOperator, accountId, projects]);

  const handleScheduleReviewTrigger = async (scheduleId: string) => {
    if (!scheduleId || !scheduleId.match(/^\d+\.\d+\.\d+$/)) return;
    setScheduleReviewLoading(true);
    setTriggeringScheduleId(scheduleId);
    setScheduleReviewError(null);
    setScheduleReviewSuccess(null);
    try {
      const res = await fetch('/api/schedule-review/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      });
      const data = await res.json();
      if (data.success) {
        setScheduleReviewSuccess(
          `Review triggered for ${scheduleId}. Tx: ${data.txHash}.`
        );
        setOperatorCreatedSchedules((prev) => prev.filter((s) => s.schedule_id !== scheduleId));
      } else {
        setScheduleReviewError(data.error || 'Failed to trigger review');
      }
    } catch (err) {
      setScheduleReviewError('Failed to trigger schedule review');
    } finally {
      setScheduleReviewLoading(false);
      setTriggeringScheduleId(null);
    }
  };

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
          threshold: Number(formData.threshold),
          signerPublicKeys: formData.signerPublicKeys,
          includeOperator: formData.includeOperator,
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

  const handleSetAdmin = async (
    contractId: string,
    newAdminThresholdAccountId: string,
    currentAdminThresholdAccountId: string,
    projectId: string
  ) => {
    const key = `${contractId}-${newAdminThresholdAccountId}`;
    setSetAdminLoading(key);
    setSetAdminError(null);
    setSetAdminSuccess(null);
    try {
      const res = await fetch('/api/set-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          newAdminThresholdAccountId,
          currentAdminThresholdAccountId,
          projectId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSetAdminSuccess(
          data.executed
            ? `Admin set successfully. Schedule ${data.scheduleId} executed.`
            : `Schedule ${data.scheduleId} created, HCS message sent${data.hcsTransactionId ? ` (tx: ${data.hcsTransactionId})` : ''}. Threshold signers must sign to execute.`
        );
        const refreshRes = await fetch(
          `/api/operator/projects?accountId=${encodeURIComponent(accountId!)}`
        );
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setProjects(refreshData.projects || []);
        }
      } else {
        setSetAdminError(data.error || 'Failed to set admin');
      }
    } catch (err) {
      setSetAdminError(err instanceof Error ? err.message : 'Failed to set admin');
    } finally {
      setSetAdminLoading(null);
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

        {projects.some(
          (p) => p.migrationScheduleId && p.migrationThresholdAccountId
        ) && (
          <div className="mb-6 rounded-xl bg-indigo-500/10 border border-indigo-500/30 overflow-hidden">
            <div className="px-4 py-3">
              <h2 className="font-semibold text-indigo-200">
                Migrating to new admin list
              </h2>
              <p className="text-xs text-indigo-200/70 mt-0.5">
                A setAdmin schedule is pending. Status is polled every 90 seconds.
              </p>
              <ul className="mt-3 space-y-2">
                {projects
                  .filter(
                    (p) =>
                      p.migrationScheduleId && p.migrationThresholdAccountId
                  )
                  .map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {p.companyName}
                      </span>
                      <span className="text-gray-400">
                        Schedule:{' '}
                        <a
                          href={`${explorerBase}/schedule/${p.migrationScheduleId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-indigo-300 hover:text-indigo-200"
                        >
                          {p.migrationScheduleId}
                        </a>
                      </span>
                      <span className="text-gray-400">
                        New list:{' '}
                        <span className="font-mono text-indigo-300">
                          {p.migrationThresholdAccountId}
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}

        {operatorPendingSchedules.length > 0 && (
          <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-500/20">
              <h2 className="font-semibold text-amber-200">
                Pending your signature ({operatorPendingSchedules.length})
              </h2>
              <p className="text-xs text-amber-200/70 mt-0.5">
                You are on the threshold list — sign these to complete execution
              </p>
            </div>
            <ul className="divide-y divide-amber-500/20">
              {operatorPendingSchedules.map((s) => (
                <li key={s.schedule_id}>
                  <Link
                    href={`/signer-dashboard/schedule/${s.schedule_id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-amber-500/10 transition-colors"
                  >
                    <div>
                      <span className="font-medium text-foreground">{s.memo || 'Scheduled Transaction'}</span>
                      <span className="text-xs text-gray-400 ml-2 font-mono">{s.schedule_id}</span>
                    </div>
                    <span className="text-amber-300 text-sm">Sign →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(operatorCreatedSchedules.length > 0 ||
          scheduleReviewSuccess ||
          scheduleReviewError ||
          setAdminSuccess ||
          setAdminError) && (
          <div className="mb-6 rounded-xl bg-blue-500/10 border border-blue-500/30 overflow-hidden">
            {operatorCreatedSchedules.length > 0 && (
              <>
                <div className="px-4 py-2 border-b border-blue-500/20">
                  <span className="text-sm font-medium text-blue-200">
                    Schedule review needed ({operatorCreatedSchedules.length})
                  </span>
                  <span className="text-xs text-blue-200/70 ml-2">
                    Trigger passive agent review ~2 min before expiry
                  </span>
                </div>
                <ul className="divide-y divide-blue-500/20">
                  {operatorCreatedSchedules.map((s) => (
                    <li
                      key={s.schedule_id}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-500/5 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-sm text-foreground truncate block">
                          {s.memo || 'Scheduled Transaction'}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{s.schedule_id}</span>
                      </div>
                      <button
                        onClick={() => handleScheduleReviewTrigger(s.schedule_id)}
                        disabled={scheduleReviewLoading || triggeringScheduleId === s.schedule_id}
                        className="ml-3 px-3 py-1 rounded-md bg-primary text-black text-xs font-semibold hover:opacity-90 disabled:opacity-50 shrink-0"
                      >
                        {triggeringScheduleId === s.schedule_id ? '…' : 'Trigger'}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {scheduleReviewError && (
              <div className="px-4 py-2 text-red-400 text-xs border-t border-blue-500/20 flex items-center justify-between">
                <span>{scheduleReviewError}</span>
                <button
                  type="button"
                  onClick={() => setScheduleReviewError(null)}
                  className="text-red-300 hover:text-red-200 ml-2"
                >
                  ×
                </button>
              </div>
            )}
            {scheduleReviewSuccess && (
              <div className="px-4 py-2 text-green-400 text-xs border-t border-blue-500/20 flex items-center justify-between">
                <span>{scheduleReviewSuccess}</span>
                <button
                  type="button"
                  onClick={() => setScheduleReviewSuccess(null)}
                  className="text-green-300 hover:text-green-200 ml-2"
                >
                  ×
                </button>
              </div>
            )}
            {setAdminError && (
              <div className="px-4 py-2 text-red-400 text-xs border-t border-blue-500/20 flex items-center justify-between">
                <span>{setAdminError}</span>
                <button
                  type="button"
                  onClick={() => setSetAdminError(null)}
                  className="text-red-300 hover:text-red-200 ml-2"
                >
                  ×
                </button>
              </div>
            )}
            {setAdminSuccess && (
              <div className="px-4 py-2 text-green-400 text-xs border-t border-blue-500/20 flex items-center justify-between">
                <span>{setAdminSuccess}</span>
                <button
                  type="button"
                  onClick={() => setSetAdminSuccess(null)}
                  className="text-green-300 hover:text-green-200 ml-2"
                >
                  ×
                </button>
              </div>
            )}
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
                  {project.contracts && project.contracts.length > 0 && (
                    <div className="mt-4">
                      <span className="text-gray-400 text-sm">Contracts:</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {project.contracts.map((c) => (
                          <a
                            key={c}
                            href={`${explorerBase}/contract/${c}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex px-3 py-1 text-sm font-mono bg-gray-700 text-primary hover:text-primary-dark rounded-lg border border-gray-600"
                          >
                            {c} →
                          </a>
                        ))}
                      </div>
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
                          className={`bg-gray-700 rounded-lg p-6 flex flex-col min-h-[200px] border ${
                            list.isCurrentAdmin
                              ? 'border-amber-500/50'
                              : 'border-gray-600'
                          }`}
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
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-gray-400 shrink-0">Admin:</span>
                              <span
                                className="text-foreground font-mono text-xs min-w-0 truncate"
                                title={list.adminDisplay ?? ''}
                              >
                                {list.isCurrentAdmin ? (
                                  <span className="text-green-400">This list</span>
                                ) : list.adminDisplay != null ? (
                                  list.adminDisplay
                                ) : (
                                  <span className="text-gray-500">—</span>
                                )}
                              </span>
                            </div>
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
                          <div className="mt-auto pt-4 flex flex-wrap gap-2 justify-end">
                            <a
                              href={`${explorerBase}/account/${list.thresholdAccountId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-600 text-gray-200 hover:bg-gray-500 cursor-pointer transition-colors"
                            >
                              View on HashScan →
                            </a>
                            {project.contractId &&
                              project.adminThresholdAccountId &&
                              !list.isCurrentAdmin && (
                              <button
                                type="button"
                                disabled={
                                  setAdminLoading ===
                                  `${project.contractId}-${list.thresholdAccountId}`
                                }
                                onClick={() =>
                                  handleSetAdmin(
                                    project.contractId!,
                                    list.thresholdAccountId,
                                    project.adminThresholdAccountId!,
                                    project.id
                                  )
                                }
                                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-amber-50 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              >
                                {setAdminLoading ===
                                `${project.contractId}-${list.thresholdAccountId}`
                                  ? 'Creating…'
                                  : 'Set Admin'}
                              </button>
                            )}
                          </div>
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
