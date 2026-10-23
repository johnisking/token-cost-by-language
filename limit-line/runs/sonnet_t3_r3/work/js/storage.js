const KEY = 'expense-tracker.transactions';

export function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (!Array.isArray(data)) return [];
    return data
      .filter((t) => t && typeof t.amount === 'number' && Number.isFinite(t.amount))
      .map((t) => ({
        date: String(t.date ?? ''),
        description: String(t.description ?? ''),
        amount: t.amount,
        category: String(t.category ?? ''),
      }));
  } catch {
    return [];
  }
}

export function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage unavailable or full; keep working in memory
  }
}
