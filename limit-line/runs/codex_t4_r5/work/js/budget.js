export function checkBudgets(items, budgets, month) {
  const prefix = `${month}-`;
  return budgets.map(({ category, limit }) => {
    const spent = items.reduce((sum, item) => sum + (item.date?.startsWith(prefix) && item.category === category && Number(item.amount) < 0 ? Math.abs(Number(item.amount)) : 0), 0);
    return { category, limit, spent, over: spent > limit };
  });
}
