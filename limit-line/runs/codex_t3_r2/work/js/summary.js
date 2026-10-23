export function summarize(items) {
  let income = 0, expense = 0;
  const byCategory = {};
  for (const item of items) {
    const amount = Number(item.amount) || 0;
    if (amount > 0) income += amount;
    else if (amount < 0) expense += Math.abs(amount);
    const category = item.category ?? '';
    byCategory[category] = (byCategory[category] ?? 0) + amount;
  }
  return { income, expense, balance: income - expense, byCategory };
}
