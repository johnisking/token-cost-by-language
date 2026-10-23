export function checkBudgets(items, budgets, month) {
  return (budgets || []).map(({ category, limit }) => {
    let spent = 0;
    for (const item of items || []) {
      if (item.category !== category) continue;
      if (!String(item.date).startsWith(month + '-')) continue;
      const amount = Number(item.amount) || 0;
      if (amount < 0) spent += -amount;
    }
    return { category, limit, spent, over: spent > limit };
  });
}
