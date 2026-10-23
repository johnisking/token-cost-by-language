// Rounds to cents and turns -0 into 0.
const round = n => Math.round(n * 100) / 100 + 0;

// Totals items, optionally limited to an inclusive {from, to} date range.
export function summarize(items, range) {
  const { from, to } = range ?? {};
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const item of items) {
    if (from && item.date < from) continue;
    if (to && item.date > to) continue;

    if (item.amount > 0) income += item.amount;
    if (item.amount < 0) expense -= item.amount;
    byCategory[item.category] = (byCategory[item.category] ?? 0) + item.amount;
  }

  for (const category of Object.keys(byCategory)) {
    byCategory[category] = round(byCategory[category]);
  }

  income = round(income);
  expense = round(expense);
  return {
    income,
    expense,
    balance: round(income - expense),
    byCategory,
  };
}
