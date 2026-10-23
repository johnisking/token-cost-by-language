function cleanNumber(num) {
  return Math.round(num * 1e8) / 1e8;
}

export function summarize(items, range) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const item of items || []) {
    if (range) {
      if (range.from && item.date < range.from) continue;
      if (range.to && item.date > range.to) continue;
    }
    const amt = Number(item.amount) || 0;
    if (amt > 0) {
      income = cleanNumber(income + amt);
    } else if (amt < 0) {
      expense = cleanNumber(expense + Math.abs(amt));
    }

    const cat = item.category || '';
    byCategory[cat] = cleanNumber((byCategory[cat] || 0) + amt);
  }

  const balance = cleanNumber(income - expense);
  return {
    income,
    expense,
    balance,
    byCategory,
  };
}
