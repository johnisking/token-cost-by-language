export function summarize(items, range = {}) {
  let income = 0, expense = 0;
  const byCategory = {};
  for (const item of items) {
    if ((range.from && item.date < range.from) || (range.to && item.date > range.to)) continue;
    const amount = Number(item.amount) || 0;
    if (amount > 0) income += amount;
    else if (amount < 0) expense += -amount;
    byCategory[item.category] = (byCategory[item.category] || 0) + amount;
  }
  return { income, expense, balance: income - expense, byCategory };
}
