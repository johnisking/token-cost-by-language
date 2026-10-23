export function checkBudgets(items, budgets, month) {
  const prefix = `${month}-`;

  return budgets.map((budget) => {
    let spent = 0;
    for (const item of items) {
      if (
        item.category === budget.category &&
        typeof item.date === 'string' &&
        item.date.startsWith(prefix) &&
        Number(item.amount) < 0
      ) {
        spent += -Number(item.amount);
      }
    }
    spent = Math.round(spent * 1e10) / 1e10;
    const limit = Number(budget.limit);
    return {
      category: budget.category,
      limit,
      spent,
      over: spent > limit,
    };
  });
}
