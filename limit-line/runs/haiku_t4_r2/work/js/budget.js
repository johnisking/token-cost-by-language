// Checks each budget against the expenses of its category in the given month.
// Returns one entry per budget, in the same order as `budgets`.
export function checkBudgets(items, budgets, month) {
  return budgets.map(({ category, limit }) => {
    let spent = 0;
    for (const item of items) {
      if (item.category === category && item.amount < 0 && item.date.slice(0, 7) === month) {
        spent -= item.amount;
      }
    }
    spent = Math.round(spent * 100) / 100;
    return { category, limit, spent, over: spent > limit };
  });
}
