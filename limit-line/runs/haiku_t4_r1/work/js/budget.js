// Returns one entry per budget, in the same order, with the expense spent in
// the given month ("YYYY-MM") and whether that is over the limit.
export function checkBudgets(items, budgets, month) {
  return budgets.map(({ category, limit }) => {
    let spent = 0;
    for (const item of items) {
      if (item.category === category && item.amount < 0 && item.date.startsWith(month)) {
        spent -= item.amount;
      }
    }
    spent = Math.round(spent * 100) / 100 + 0;
    return { category, limit, spent, over: spent > limit };
  });
}
