function roundCurrency(num) {
  return Math.round((num + Number.EPSILON) * 1e10) / 1e10;
}

export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  if (Array.isArray(items)) {
    for (const item of items) {
      const amount = Number(item.amount) || 0;
      const category = item.category || 'Uncategorized';

      if (amount > 0) {
        income = roundCurrency(income + amount);
      } else if (amount < 0) {
        expense = roundCurrency(expense + Math.abs(amount));
      }

      byCategory[category] = roundCurrency((byCategory[category] || 0) + amount);
    }
  }

  const balance = roundCurrency(income - expense);

  return {
    income,
    expense,
    balance,
    byCategory,
  };
}
