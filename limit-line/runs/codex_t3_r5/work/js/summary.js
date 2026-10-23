export function summarize(items) {
  let income = 0, expense = 0;
  const byCategory = {};
  for (const item of items) {
    const amount = Number(item.amount) || 0;
    if (amount > 0) income += amount;
    if (amount < 0) expense += -amount;
    const category = item.category || 'Other';
    byCategory[category] = (byCategory[category] || 0) + amount;
  }
  return { income, expense, balance: income - expense, byCategory };
}
