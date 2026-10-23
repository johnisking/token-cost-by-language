export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};
  for (const it of items) {
    const a = Number(it.amount) || 0;
    if (a > 0) income += a;
    else if (a < 0) expense += -a;
    byCategory[it.category] = (byCategory[it.category] || 0) + a;
  }
  return { income, expense, balance: income - expense, byCategory };
}
