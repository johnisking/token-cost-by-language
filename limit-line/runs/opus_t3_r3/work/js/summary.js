const round2 = (n) => Math.round(n * 100) / 100;

export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const item of items || []) {
    const amount = Number(item.amount) || 0;
    if (amount > 0) income += amount;
    else if (amount < 0) expense += -amount;
    const cat = item.category;
    byCategory[cat] = (byCategory[cat] || 0) + amount;
  }

  for (const cat of Object.keys(byCategory)) byCategory[cat] = round2(byCategory[cat]);
  income = round2(income);
  expense = round2(expense);
  return { income, expense, balance: round2(income - expense), byCategory };
}
