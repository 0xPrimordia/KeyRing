'use client';

import { useState, useEffect } from 'react';

export interface CreateThresholdListFormData {
  threshold: number;
  signerCount: number;
  includeOperator: boolean;
  includePassiveAgents: boolean;
  includeValidatorAgent: boolean;
  initialBalanceHbar: number;
  memo: string;
}

const DEFAULT_FORM: CreateThresholdListFormData = {
  threshold: 2,
  signerCount: 2,
  includeOperator: true,
  includePassiveAgents: false,
  includeValidatorAgent: false,
  initialBalanceHbar: 5,
  memo: 'KeyRing Protocol Threshold List',
};

interface CreateThresholdListFormProps {
  projectId: string;
  projectName?: string;
  onClose: () => void;
  onSubmit: (data: CreateThresholdListFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateThresholdListForm({
  projectId,
  projectName,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateThresholdListFormProps) {
  const [form, setForm] = useState<CreateThresholdListFormData>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [maxSigners, setMaxSigners] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/signers/available-for-threshold');
        const data = await res.json();
        if (!cancelled && data.success && typeof data.count === 'number') {
          const max = Math.max(0, data.count);
          setMaxSigners(max);
          setForm((prev) => {
            const newSignerCount = max > 0 ? Math.min(Math.max(1, prev.signerCount), max) : 0;
            const newTotal = (prev.includeOperator ? 1 : 0) + newSignerCount + (prev.includePassiveAgents ? 2 : 0) + (prev.includeValidatorAgent ? 1 : 0);
            return {
              ...prev,
              signerCount: newSignerCount,
              threshold: Math.min(prev.threshold, Math.max(1, newTotal)),
            };
          });
        }
      } catch {
        if (!cancelled) setMaxSigners(0);
      } finally {
        if (!cancelled) setLoadingCount(false);
      }
    };
    fetchCount();
    return () => { cancelled = true; };
  }, []);

  const totalKeys =
    (form.includeOperator ? 1 : 0) +
    form.signerCount +
    (form.includePassiveAgents ? 2 : 0) +
    (form.includeValidatorAgent ? 1 : 0);

  const isValid =
    form.threshold >= 1 &&
    form.threshold <= totalKeys &&
    totalKeys >= 1 &&
    form.signerCount >= 1 &&
    form.signerCount <= maxSigners;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValid) {
      setError(
        maxSigners === 0
          ? 'No signers available. Add Hedera signers to the registry first.'
          : `Threshold must be between 1 and ${totalKeys}. Signers: 1–${maxSigners}.`
      );
      return;
    }
    await onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-gray-800 border border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Number of signers (from registry)
            </label>
            <input
              type="number"
              min={maxSigners > 0 ? 1 : 0}
              max={maxSigners}
              value={form.signerCount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  signerCount: Math.min(
                    Math.max(maxSigners > 0 ? 1 : 0, parseInt(e.target.value, 10) || 0),
                    maxSigners
                  ),
                }))
              }
              disabled={loadingCount || maxSigners === 0}
              className="w-full px-3 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-foreground text-sm focus:border-primary disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-0.5">
              {loadingCount
                ? 'Loading...'
                : `${maxSigners} ${maxSigners === 1 ? 'signer' : 'signers'} available (randomly selected)`}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Threshold</label>
            <input
              type="number"
              min={1}
              max={totalKeys}
              value={form.threshold}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  threshold: Math.min(
                    Math.max(1, parseInt(e.target.value, 10) || 1),
                    totalKeys
                  ),
                }))
              }
              className="w-full px-3 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-foreground text-sm focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-0.5">
              {form.threshold}-of-{totalKeys}
              {form.includeOperator ? ' (operator + ' : ' ('}
              {form.signerCount} signers
              {form.includePassiveAgents ? ' + 2 passive agents' : ''}
              {form.includeValidatorAgent ? ' + validator agent' : ''})
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={form.includeOperator}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    includeOperator: !prev.includeOperator,
                  }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-800 ${
                  form.includeOperator ? 'bg-primary' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                    form.includeOperator ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-400">Operator</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={form.includePassiveAgents}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    includePassiveAgents: !prev.includePassiveAgents,
                  }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-800 ${
                  form.includePassiveAgents ? 'bg-primary' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                    form.includePassiveAgents ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-400">Passive</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={form.includeValidatorAgent}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    includeValidatorAgent: !prev.includeValidatorAgent,
                  }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-800 ${
                  form.includeValidatorAgent ? 'bg-primary' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                    form.includeValidatorAgent ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-400">Validator</span>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Initial balance (HBAR)</label>
              <input
                type="number"
                min={1}
                step={0.1}
                value={form.initialBalanceHbar}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    initialBalanceHbar: parseFloat(e.target.value) || 5,
                  }))
                }
                className="w-full px-3 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-foreground text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Memo</label>
              <input
                type="text"
                value={form.memo}
                disabled
                readOnly
                className="w-full px-3 py-1.5 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-500 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting || loadingCount}
              className="flex-1 px-3 py-2 rounded-lg bg-primary text-black text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Threshold List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
