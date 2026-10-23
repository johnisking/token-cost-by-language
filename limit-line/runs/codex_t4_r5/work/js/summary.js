export function summarize(items, range = {}) {
  const byCategory = {};
  let income = 0, expense = 0;
  for (const item of items) {
    if (range.from && item.date < range.from) continue;
    if (range.to && item.date > range.to) continue;
    const amount = Number(item.amount) || 0;
    if (amount > 0) income += amount;
    if (amount < 0) expense += Math.abs(amount);
    byCategory[item.category] = (byCategory[item.category] || 0) + amount;
  }
  return { income, expense, balance: income - expense, byCategory };
}
