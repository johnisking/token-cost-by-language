const KEY = 'expense-tracker.transactions';

export function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function save(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
