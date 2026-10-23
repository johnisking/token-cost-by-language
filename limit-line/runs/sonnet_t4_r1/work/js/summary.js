const clean = n => Math.round(n * 1e9) / 1e9;

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
    else expense -= it.amount;
    byCategory[it.category] = (byCategory[it.category] || 0) + it.amount;
  }
  for (const k of Object.keys(byCategory)) byCategory[k] = clean(byCategory[k]);
  income = clean(income);
  expense = clean(expense);
  return { income, expense, balance: clean(income - expense), byCategory };
}
