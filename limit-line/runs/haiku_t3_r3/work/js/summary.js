// Totals for a list of transactions. Positive amounts are income,
// negative amounts are expenses.
export function summarize(items) {
  const summary = { income: 0, expense: 0, balance: 0, byCategory: {} };

  for (const { amount, category } of items) {
    if (amount > 0) summary.income += amount;
    else if (amount < 0) summary.expense += -amount;

    summary.byCategory[category] = (summary.byCategory[category] || 0) + amount;
  }

  summary.balance = summary.income - summary.expense;
  return summary;
}
