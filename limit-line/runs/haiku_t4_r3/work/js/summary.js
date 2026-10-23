// Rounds to cents so floating point noise (0.1 + 0.2) does not leak into results.
const cents = (n) => Math.round(n * 100) / 100;

// range is optional: {from, to} with inclusive YYYY-MM-DD dates.
export function summarize(items, range) {
  const from = range?.from;
  const to = range?.to;
  let income = 0;
  let expense = 0;
  const sums = {};

  for (const item of items) {
    if (from && item.date < from) continue;
    if (to && item.date > to) continue;

    const amount = Number(item.amount);
    if (amount > 0) income += amount;
    else if (amount < 0) expense -= amount;
    sums[item.category] = (sums[item.category] ?? 0) + amount;
  }

  const byCategory = {};
  for (const [category, total] of Object.entries(sums)) {
    byCategory[category] = cents(total);
  }

  return {
    income: cents(income),
    expense: cents(expense),
    balance: cents(income - expense),
    byCategory,
  };
}
