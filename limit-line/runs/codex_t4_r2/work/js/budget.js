export function checkBudgets(items, budgets, month) {
  return budgets.map(({ category, limit }) => {
    const spent = items.reduce((sum, item) => item.date?.startsWith(`${month}-`) && item.category === category && Number(item.amount) < 0 ? sum - Number(item.amount) : sum, 0);
    return { category, limit, spent, over: spent > limit };
  });
}
