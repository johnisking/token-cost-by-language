export function summarize(items, range) {
  let income = 0;
  let expense = 0;
  const byCategory = {};
  for (const it of items) {
    if (range) {
      if (range.from && it.date < range.from) continue;
      if (range.to && it.date > range.to) continue;
    }
    if (it.amount > 0) income += it.amount;
    else if (it.amount < 0) expense += -it.amount;
    byCategory[it.category] = (byCategory[it.category] ?? 0) + it.amount;
  }
  return { income, expense, balance: income - expense, byCategory };
}
