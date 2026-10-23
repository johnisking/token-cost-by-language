export function summarize(items) { let income = 0, expense = 0; const byCategory = {};
  for (const i of items) { if (i.amount > 0) income += i.amount; else expense -= i.amount; byCategory[i.category] = (byCategory[i.category] || 0) + i.amount; }
  return { income, expense, balance: income - expense, byCategory }; }
