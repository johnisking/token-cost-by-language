export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  if (Array.isArray(items)) {
    for (const item of items) {
      const amount = Number(item.amount) || 0;
      const category = item.category || '';

      if (amount > 0) {
        income += amount;
      } else if (amount < 0) {
        expense += -amount;
      }

      byCategory[category] = (byCategory[category] || 0) + amount;
    }
  }

  const balance = income - expense;

  return {
    income,
    expense,
    balance,
    byCategory,
  };
}
