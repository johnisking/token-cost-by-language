export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};
  for (const it of items) {
    const amount = Number(it.amount) || 0;
    if (amount > 0) income += amount;
    else if (amount < 0) expense += -amount;
    byCategory[it.category] = (byCategory[it.category] || 0) + amount;
  }
  return { income, expense, balance: income - expense, byCategory };
}
