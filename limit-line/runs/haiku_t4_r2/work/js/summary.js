// Rounds to cents and removes negative zero.
function round2(n) {
  return Math.round(n * 100) / 100 + 0;
}

// Summarizes items whose date lies in the inclusive range {from, to}.
// Missing or empty range bounds are treated as open.
export function summarize(items, range) {
  const from = range?.from;
  const to = range?.to;
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const item of items) {
    if (from && item.date < from) continue;
    if (to && item.date > to) continue;

    if (item.amount > 0) {
      income += item.amount;
    } else if (item.amount < 0) {
      expense -= item.amount;
    }
    byCategory[item.category] = (byCategory[item.category] || 0) + item.amount;
  }

  for (const category of Object.keys(byCategory)) {
    byCategory[category] = round2(byCategory[category]);
  }
  income = round2(income);
  expense = round2(expense);

  return {
    income,
    expense,
    balance: round2(income - expense),
    byCategory,
  };
}
