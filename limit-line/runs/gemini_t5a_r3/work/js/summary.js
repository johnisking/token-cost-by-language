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
      expense += -amount;
    }

    const cat = item.category;
    byCategory[cat] = (byCategory[cat] || 0) + amount;
  }

  const balance = income - expense;

  return {
    income,
    expense,
    balance,
    byCategory,
  };
}
