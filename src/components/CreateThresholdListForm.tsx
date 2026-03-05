'use client';

import { useState } from 'react';

export interface CreateThresholdListFormData {
  threshold: number;
  signerPublicKeys: string[];
  includePassiveAgents: boolean;
  includeValidatorAgent: boolean;
  initialBalanceHbar: number;
  memo: string;
}

const DEFAULT_FORM: CreateThresholdListFormData = {
  threshold: 2,
  signerPublicKeys: [''],
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

  const totalKeys =
    1 + // connected account (operator)
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
      <div className="w-full max-w-lg rounded-2xl bg-gray-800 border border-gray-700 shadow-xl">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-foreground">
            Create Threshold List
          </h2>
          {projectName && (
            <p className="text-sm text-gray-400 mt-1">for {projectName}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Threshold (signatures required)
            </label>
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
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              {form.threshold}-of-{totalKeys} (1 operator + {form.signerPublicKeys.filter((k) => k.trim()).length} signers
              {form.includePassiveAgents ? ' + 2 passive agents' : ''}
              {form.includeValidatorAgent ? ' + validator agent' : ''})
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Signer public keys
              </label>
              <button
                type="button"
                onClick={handleAddSigner}
                className="text-sm text-primary hover:text-primary-dark"
              >
                + Add signer
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {form.signerPublicKeys.map((key, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="DER (302a...) or 64-char hex"
                    value={key}
                    onChange={(e) => handleSignerChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-foreground text-sm font-mono focus:border-primary"
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

          <div className="flex items-center gap-3">
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
            <div>
              <label className="text-sm font-medium text-gray-300">
                Include passive agents
              </label>
              <p className="text-xs text-gray-500">
                Add 2 passive agent signers from env (PASSIVE_AGENT_1/2_PUBLIC_KEY)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
            <div>
              <label className="text-sm font-medium text-gray-300">
                Include validator agent
              </label>
              <p className="text-xs text-gray-500">
                Add validator agent from env (VALIDATION_AGENT_PUBLIC_KEY)
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Initial balance (HBAR)
            </label>
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
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-foreground focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Account memo
            </label>
            <input
              type="text"
              value={form.memo}
              disabled
              readOnly
              className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-black font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Threshold List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
