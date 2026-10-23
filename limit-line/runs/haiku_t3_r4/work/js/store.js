const STORAGE_KEY = 'expense-tracker.transactions';

// Read saved transactions from localStorage; returns [] if nothing valid is saved.
export function loadTransactions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTransactions(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
