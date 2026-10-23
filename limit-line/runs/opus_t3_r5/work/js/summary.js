// Round to cents to avoid floating point noise like 0.30000000000000004.
const round = (n) => Math.round(n * 100) / 100;

export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const item of items || []) {
    const amount = Number(item.amount) || 0;
    if (amount > 0) income += amount;
    else if (amount < 0) expense += -amount;
    const cat = item.category ?? '';
    byCategory[cat] = (byCategory[cat] || 0) + amount;
  }

  for (const cat of Object.keys(byCategory)) byCategory[cat] = round(byCategory[cat]);
  income = round(income);
  expense = round(expense);
  return { income, expense, balance: round(income - expense), byCategory };
}

// Sum of expenses (as positive numbers) per category; used by the chart.
export function expensesByCategory(items) {
  const result = {};
  for (const item of items || []) {
    const amount = Number(item.amount) || 0;
    if (amount < 0) {
      const cat = item.category ?? '';
      result[cat] = round((result[cat] || 0) - amount);
    }
  }
  return result;
}
