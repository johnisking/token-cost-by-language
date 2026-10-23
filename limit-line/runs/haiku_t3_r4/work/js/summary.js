// Round to cents so floating-point noise (0.1 + 0.2) does not leak into totals.
function round2(value) {
  return Math.round(value * 100) / 100;
}

// Totals for a list of transactions.
// income: sum of positive amounts
// expense: sum of negative amounts, as a positive number
// balance: income - expense
// byCategory: category -> sum of its (signed) amounts
export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const item of items) {
    const amount = Number(item.amount);
    if (amount > 0) {
      income += amount;
    } else if (amount < 0) {
      expense += -amount;
    }
    byCategory[item.category] = (byCategory[item.category] ?? 0) + amount;
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
