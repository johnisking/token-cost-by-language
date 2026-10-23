export function checkBudgets(items, budgets, month) {
  const totals = new Map();
  for (const item of items) {
    if (item.date?.slice(0, 7) !== month || Number(item.amount) >= 0) continue;
    totals.set(item.category, (totals.get(item.category) || 0) + Math.abs(Number(item.amount)));
  }
  return budgets.map(({ category, limit }) => {
    const spent = totals.get(category) || 0;
    return { category, limit, spent, over: spent > limit };
  });
}
