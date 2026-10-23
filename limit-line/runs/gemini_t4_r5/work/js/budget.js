function cleanNumber(num) {
  return Math.round(num * 1e8) / 1e8;
}

export function checkBudgets(items, budgets, month) {
  return (budgets || []).map((b) => {
    const category = b.category;
    const limit = Number(b.limit);
    let spent = 0;

    for (const item of items || []) {
      if (month && (!item.date || !item.date.startsWith(month))) continue;
      if (item.category === category && Number(item.amount) < 0) {
        spent = cleanNumber(spent + Math.abs(Number(item.amount)));
      }
    }

    return {
      category,
      limit,
      spent,
      over: spent > limit,
    };
  });
}
