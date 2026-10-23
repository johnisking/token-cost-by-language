export function checkBudgets(items, budgets, month) {
  return (budgets || []).map(({ category, limit }) => {
    let spent = 0;
    for (const it of items || []) {
      const amount = Number(it.amount) || 0;
      if (it.category === category && amount < 0 && String(it.date).slice(0, 7) === month) {
        spent -= amount;
      }
    }
    return { category, limit, spent, over: spent > limit };
  });
}
