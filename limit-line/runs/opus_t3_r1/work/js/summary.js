// Round to cents to avoid floating point noise like 0.30000000000000004.
const round2 = (n) => Math.round(n * 100) / 100;

export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const item of items || []) {
    const amount = Number(item.amount) || 0;
    if (amount > 0) income += amount;
    else if (amount < 0) expense += -amount;
    const cat = item.category || '';
    byCategory[cat] = (byCategory[cat] || 0) + amount;
  }

  for (const cat of Object.keys(byCategory)) byCategory[cat] = round2(byCategory[cat]);
  income = round2(income);
  expense = round2(expense);

  return { income, expense, balance: round2(income - expense), byCategory };
}

// Expense totals per category (positive numbers), for charting.
export function expensesByCategory(items) {
  const totals = {};
  for (const item of items || []) {
    const amount = Number(item.amount) || 0;
    if (amount < 0) {
      const cat = item.category || '';
      totals[cat] = round2((totals[cat] || 0) - amount);
    }
  }
  return totals;
}
