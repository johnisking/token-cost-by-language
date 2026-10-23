// Persistence of transactions and budgets in localStorage.

const TX_KEY = 'budget-app.transactions';
const BUDGET_KEY = 'budget-app.budgets';

function load(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or unavailable; the app keeps working in memory.
  }
}

export const loadTransactions = () => load(TX_KEY);
export const saveTransactions = (items) => save(TX_KEY, items);
export const loadBudgets = () => load(BUDGET_KEY);
export const saveBudgets = (budgets) => save(BUDGET_KEY, budgets);
