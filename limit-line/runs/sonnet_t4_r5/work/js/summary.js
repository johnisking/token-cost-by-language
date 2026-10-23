const clean = (n) => Math.round(n * 1e8) / 1e8;

export function summarize(items, range) {
  const from = range && range.from;
  const to = range && range.to;
  let income = 0;
  let expense = 0;
  const byCategory = {};
  for (const it of items) {
    if (from && it.date < from) continue;
    if (to && it.date > to) continue;
    if (it.amount > 0) income += it.amount;
    else if (it.amount < 0) expense += -it.amount;
    byCategory[it.category] = (byCategory[it.category] || 0) + it.amount;
  }
  for (const k of Object.keys(byCategory)) byCategory[k] = clean(byCategory[k]);
  income = clean(income);
  expense = clean(expense);
  return { income, expense, balance: clean(income - expense), byCategory };
}
