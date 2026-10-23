export function checkBudgets(items, budgets, month) {
  return budgets.map(({ category, limit }) => {
    let spent = 0;
    for (const it of items) {
      if (it.category === category && it.date.startsWith(month) && it.amount < 0) {
        spent += -it.amount;
      }
    }
    return { category, limit, spent, over: spent > limit };
  });
}
