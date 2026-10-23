export function checkBudgets(items, budgets, month) {
  return budgets.map(b => { const spent = items.filter(i => i.category === b.category && i.date.startsWith(month) && i.amount < 0).reduce((s, i) => s - i.amount, 0);
    return { category: b.category, limit: b.limit, spent, over: spent > b.limit }; }); }
