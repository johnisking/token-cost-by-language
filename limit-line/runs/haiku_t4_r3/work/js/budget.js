// month is "YYYY-MM". spent is the expense (as a positive number) of each budget's category in that month.
export function checkBudgets(items, budgets, month) {
  const spentByCategory = {};
  for (const item of items) {
    if (!item.date.startsWith(`${month}-`)) continue;
    const amount = Number(item.amount);
    if (amount < 0) {
      spentByCategory[item.category] = (spentByCategory[item.category] ?? 0) - amount;
    }
  }

  return budgets.map(({ category, limit }) => {
    const spent = Math.round((spentByCategory[category] ?? 0) * 100) / 100;
    return { category, limit, spent, over: spent > limit };
  });
}
