export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};
  for (const t of items) {
    const a = Number(t.amount) || 0;
    if (a > 0) income += a;
    else if (a < 0) expense += -a;
    byCategory[t.category] = (byCategory[t.category] || 0) + a;
  }
  return { income, expense, balance: income - expense, byCategory };
}
