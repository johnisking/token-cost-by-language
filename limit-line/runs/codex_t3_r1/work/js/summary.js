export function summarize(items) {
  let income = 0;
  let expenses = 0;
  const byCategory = {};

  for (const item of items) {
    const amount = Number(item.amount) || 0;
    if (amount > 0) income += amount;
    if (amount < 0) expenses += Math.abs(amount);
    const category = String(item.category ?? '');
    byCategory[category] = (byCategory[category] || 0) + amount;
  }

  return { income, expense: expenses, balance: income - expenses, byCategory };
}
