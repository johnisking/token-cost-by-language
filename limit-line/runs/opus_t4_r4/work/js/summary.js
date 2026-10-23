export const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

export function inRange(date, range) {
  if (!range) return true;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

export function summarize(items, range) {
  let income = 0;
  let expense = 0;
  const byCategory = {};
  for (const it of items || []) {
    if (!inRange(it.date, range)) continue;
    const amount = Number(it.amount) || 0;
    if (amount > 0) income += amount;
    else expense -= amount;
    byCategory[it.category] = (byCategory[it.category] || 0) + amount;
  }
  for (const k of Object.keys(byCategory)) byCategory[k] = round2(byCategory[k]);
  income = round2(income);
  expense = round2(expense);
  return { income, expense, balance: round2(income - expense), byCategory };
}
