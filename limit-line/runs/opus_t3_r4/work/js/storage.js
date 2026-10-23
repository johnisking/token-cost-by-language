// Persist transactions in localStorage.

const KEY = 'expense-tracker.transactions';

export function loadTransactions() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data
      .filter((t) => t && Number.isFinite(Number(t.amount)))
      .map((t) => ({
        date: String(t.date ?? ''),
        description: String(t.description ?? ''),
        amount: Number(t.amount),
        category: String(t.category ?? ''),
      }));
  } catch {
    return [];
  }
}

export function saveTransactions(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Could not save transactions', err);
  }
}
