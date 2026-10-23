export function checkBudgets(items, budgets, month) {
  return budgets.map(({ category, limit }) => {
    let spent = 0;
    for (const it of items) {
      if (it.category === category && it.amount < 0 && String(it.date).slice(0, 7) === month) {
        spent += -it.amount;
      }
    }
    spent = Math.round(spent * 1e8) / 1e8;
    return { category, limit, spent, over: spent > limit };
  });
}
