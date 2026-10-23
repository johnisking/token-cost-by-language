export function summarize(items, range) {
  let income = 0;
  let expense = 0;
  const byCategory = {};
  for (const it of items) {
    if (range) {
      if (range.from && it.date < range.from) continue;
      if (range.to && it.date > range.to) continue;
    }
    const a = Number(it.amount);
    if (a > 0) income += a;
    else if (a < 0) expense += -a;
    byCategory[it.category] = (byCategory[it.category] || 0) + a;
  }
  return { income, expense, balance: income - expense, byCategory };
}
