// Totals for a list of transactions, optionally limited to a date range.

export function round2(n) {
  const r = Math.round((n + Number.EPSILON) * 100) / 100;
  return r === 0 ? 0 : r; // avoid -0
}

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
  for (const item of items || []) {
    if (!inRange(item.date, range)) continue;
    const amount = Number(item.amount) || 0;
    if (amount > 0) income += amount;
    else if (amount < 0) expense -= amount;
    byCategory[item.category] = (byCategory[item.category] || 0) + amount;
  }
  for (const key of Object.keys(byCategory)) byCategory[key] = round2(byCategory[key]);
  income = round2(income);
  expense = round2(expense);
  return { income, expense, balance: round2(income - expense), byCategory };
}
