// Totals for a list of transactions.

// Round to cents to avoid floating point noise like 0.1 + 0.2.
const round2 = (n) => Math.round(n * 100) / 100;

export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const item of items || []) {
    const amount = Number(item.amount);
    if (!Number.isFinite(amount)) continue;

    if (amount > 0) income += amount;
    else if (amount < 0) expense += -amount;

    const category = item.category;
    byCategory[category] = (byCategory[category] || 0) + amount;
  }

  for (const key of Object.keys(byCategory)) {
    byCategory[key] = round2(byCategory[key]);
  }

  income = round2(income);
  expense = round2(expense);
  return { income, expense, balance: round2(income - expense), byCategory };
}

// Expense totals per category as positive numbers (only categories with expenses).
export function expensesByCategory(items) {
  const totals = {};
  for (const item of items || []) {
    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount >= 0) continue;
    totals[item.category] = (totals[item.category] || 0) - amount;
  }
  for (const key of Object.keys(totals)) totals[key] = round2(totals[key]);
  return totals;
}
