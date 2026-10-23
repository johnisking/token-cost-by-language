// Rounds to cents to avoid floating-point noise such as 0.1 + 0.2.
function toCents(value) {
  return Math.round(value * 100) / 100;
}

// Totals income, expense and per-category sums for a list of transactions.
export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const { amount, category } of items) {
    const n = Number(amount);
    if (n > 0) {
      income += n;
    } else if (n < 0) {
      expense += -n;
    }
    byCategory[category] = (byCategory[category] ?? 0) + n;
  }

  for (const category of Object.keys(byCategory)) {
    byCategory[category] = toCents(byCategory[category]);
  }

  const incomeTotal = toCents(income);
  const expenseTotal = toCents(expense);

  return {
    income: incomeTotal,
    expense: expenseTotal,
    balance: toCents(incomeTotal - expenseTotal),
    byCategory,
  };
}
