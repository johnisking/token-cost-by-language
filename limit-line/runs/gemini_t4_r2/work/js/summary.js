export function summarize(items, range) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const item of items || []) {
    if (range) {
      if (range.from && item.date < range.from) continue;
      if (range.to && item.date > range.to) continue;
    }

    const amount = Number(item.amount) || 0;
    if (amount > 0) {
      income += amount;
    } else if (amount < 0) {
      expense += Math.abs(amount);
    }

    const cat = item.category;
    byCategory[cat] = (byCategory[cat] || 0) + amount;
  }

  // Round to avoid floating point precision quirks if needed, or keep exact
  income = Math.round(income * 1e10) / 1e10;
  expense = Math.round(expense * 1e10) / 1e10;
  const balance = Math.round((income - expense) * 1e10) / 1e10;

  for (const cat of Object.keys(byCategory)) {
    byCategory[cat] = Math.round(byCategory[cat] * 1e10) / 1e10;
  }

  return {
    income,
    expense,
    balance,
    byCategory,
  };
}
