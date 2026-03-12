'use client';

import { useState } from 'react';

export interface CreateThresholdListFormData {
  threshold: number;
  signerPublicKeys: string[];
  includeOperator: boolean;
  includePassiveAgents: boolean;
  includeValidatorAgent: boolean;
  initialBalanceHbar: number;
  memo: string;
}

const DEFAULT_FORM: CreateThresholdListFormData = {
  threshold: 2,
  signerPublicKeys: [''],
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
  const [accountIdInput, setAccountIdInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleAddByAccountId = async () => {
    const id = accountIdInput.trim();
    if (!id || !id.match(/^\d+\.\d+\.\d+$/)) {
      setError('Enter a valid Hedera account ID (e.g. 0.0.4372449)');
      return;
    }
    setLookupLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/get-public-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: id }),
      });
      const data = await res.json();
      if (!data.success || !data.publicKey) {
        throw new Error(data.error || 'Failed to fetch public key');
      }
      setForm((prev) => ({
        ...prev,
        signerPublicKeys: [...prev.signerPublicKeys.filter((k) => k.trim()), data.publicKey],
      }));
      setAccountIdInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup account');
    } finally {
      setLookupLoading(false);
    }
  };

  const totalKeys =
    (form.includeOperator ? 1 : 0) + // connected account (operator)
    form.signerPublicKeys.filter((k) => k.trim()).length +
    (form.includePassiveAgents ? 2 : 0) + // passive agents from env
    (form.includeValidatorAgent ? 1 : 0); // validator agent from env

  const isValid =
    form.threshold >= 1 &&
    form.threshold <= totalKeys &&
    totalKeys >= 1;

  const handleAddSigner = () => {
    setForm((prev) => ({
      ...prev,
      signerPublicKeys: [...prev.signerPublicKeys, ''],
    }));
  };

  const handleRemoveSigner = (index: number) => {
    setForm((prev) => ({
      ...prev,
      signerPublicKeys: prev.signerPublicKeys.filter((_, i) => i !== index),
    }));
  };

  const handleSignerChange = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      signerPublicKeys: prev.signerPublicKeys.map((k, i) =>
        i === index ? value : k
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValid) {
      setError(`Threshold must be between 1 and ${totalKeys}`);
      return;
    }
    const signerKeys = form.signerPublicKeys.filter((k) => k.trim());
    await onSubmit({
      ...form,
      signerPublicKeys: signerKeys,
    });
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
            <label className="block text-xs font-medium text-gray-400 mb-1">Threshold</label>
            <input
              type="number"
              min={1}
              max={totalKeys}
              value={form.threshold}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  threshold: parseInt(e.target.value, 10) || 1,
                }))
              }
              className="w-full px-3 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-foreground text-sm focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-0.5">
              {form.threshold}-of-{totalKeys}
              {form.includeOperator ? ' (operator + ' : ' ('}
              {form.signerPublicKeys.filter((k) => k.trim()).length} signers
              {form.includePassiveAgents ? ' + 2 passive agents' : ''}
              {form.includeValidatorAgent ? ' + validator agent' : ''})
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Add by account ID</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="0.0.4372449"
                value={accountIdInput}
                onChange={(e) => {
                  setAccountIdInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), handleAddByAccountId())
                }
                className="flex-1 px-3 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-foreground text-sm font-mono focus:border-primary"
              />
              <button
                type="button"
                onClick={handleAddByAccountId}
                disabled={lookupLoading || !accountIdInput.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-black text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lookupLoading ? '...' : 'Add'}
              </button>
            </div>

            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400">Or paste keys</label>
              <button type="button" onClick={handleAddSigner} className="text-xs text-primary hover:text-primary-dark">
                + Add
              </button>
            </div>
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {form.signerPublicKeys.map((key, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="DER (302a...) or 64-char hex"
                    value={key}
                    onChange={(e) => handleSignerChange(index, e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-foreground text-xs font-mono focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSigner(index)}
                    className="px-3 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                    aria-label="Remove signer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
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
              disabled={!isValid || isSubmitting}
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
