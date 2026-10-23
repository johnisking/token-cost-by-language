export function checkBudgets(items, budgets, month) {
  return budgets.map(({ category, limit }) => {
    const spent = items.reduce((sum, item) => item.category === category && item.date.startsWith(`${month}-`) && Number(item.amount) < 0 ? sum - Number(item.amount) : sum, 0);
    return { category, limit, spent, over: spent > limit };
  });
}
