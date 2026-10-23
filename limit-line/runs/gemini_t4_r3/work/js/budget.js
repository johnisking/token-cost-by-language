export function checkBudgets(items, budgets, month) {
  const prefix = month + '-';
  const spentByCategory = {};

  for (const item of items) {
    if (item.date && item.date.startsWith(prefix)) {
      const amt = Number(item.amount);
      if (amt < 0) {
        spentByCategory[item.category] = (spentByCategory[item.category] || 0) + Math.abs(amt);
      }
    }
  }

  return budgets.map((b) => {
    const rawSpent = spentByCategory[b.category] || 0;
    const spent = Math.round(rawSpent * 1e10) / 1e10;
    const limit = Number(b.limit);
    return {
      category: b.category,
      limit,
      spent,
      over: spent > limit
    };
  });
}
