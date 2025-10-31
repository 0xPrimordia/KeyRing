// Simple in-memory progress store
const progressStore = new Map<string, {
  step: string;
  completed: boolean;
  error?: string;
}>();

export function setProgress(accountId: string, step: string) {
  progressStore.set(accountId, { step, completed: false });
}

export function setComplete(accountId: string) {
  const current = progressStore.get(accountId);
  if (current) {
    progressStore.set(accountId, { ...current, completed: true });
  }
}

export function setError(accountId: string, error: string) {
  const current = progressStore.get(accountId);
  if (current) {
    progressStore.set(accountId, { ...current, error, completed: true });
  }
}

export function getProgress(accountId: string) {
  return progressStore.get(accountId) || { step: 'Not started', completed: false };
}

export function clearProgress(accountId: string) {
  progressStore.delete(accountId);
}

