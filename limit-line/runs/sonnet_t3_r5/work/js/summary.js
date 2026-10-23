export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};
  for (const { amount, category } of items) {
    if (amount > 0) income += amount;
    else if (amount < 0) expense += -amount;
    byCategory[category] = (byCategory[category] || 0) + amount;
  }
  return { income, expense, balance: income - expense, byCategory };
}
