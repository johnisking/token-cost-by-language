// income: sum of positive amounts
// expense: sum of negative amounts, as a positive number
// balance: income - expense
// byCategory: category -> sum of its (signed) amounts
export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const { amount, category } of items) {
    if (amount > 0) income += amount;
    else if (amount < 0) expense -= amount;

    byCategory[category] = (byCategory[category] ?? 0) + amount;
  }

  return { income, expense, balance: income - expense, byCategory };
}

// category -> total of its expenses, as positive numbers (used by the chart)
export function expenseByCategory(items) {
  const totals = {};
  for (const { amount, category } of items) {
    if (amount < 0) totals[category] = (totals[category] ?? 0) - amount;
  }
  return totals;
}
