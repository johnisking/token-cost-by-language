export const round2 = (n) => Math.round(n * 100) / 100;

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
    else expense -= amount;
    byCategory[item.category] = (byCategory[item.category] || 0) + amount;
  }
  for (const key of Object.keys(byCategory)) byCategory[key] = round2(byCategory[key]);
  income = round2(income);
  expense = round2(expense);
  return { income, expense, balance: round2(income - expense), byCategory };
}
