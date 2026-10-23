const KEY = 'expense-tracker.transactions';

export function loadItems() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveItems(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage may be unavailable (e.g. private mode); keep working in memory.
  }
}
