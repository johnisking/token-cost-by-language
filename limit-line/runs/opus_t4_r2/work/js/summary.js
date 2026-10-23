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
    else if (amount < 0) expense -= amount;
    byCategory[it.category] = (byCategory[it.category] || 0) + amount;
  }
  return { income, expense, balance: income - expense, byCategory };
}
