export function checkBudgets(items, budgets, month) {
  const prefix = month ? `${month}-` : '';
  const monthItems = (items || []).filter(item =>
    month ? item.date && item.date.startsWith(prefix) : true
  );

  return (budgets || []).map(b => {
    const category = b.category;
    const limit = Number(b.limit);
    let spent = 0;

    for (const item of monthItems) {
      if (item.category === category) {
        const amt = Number(item.amount) || 0;
        if (amt < 0) {
          spent += Math.abs(amt);
        }
      }
    }

    spent = Math.round(spent * 1e10) / 1e10;

    return {
      category,
      limit,
      spent,
      over: spent > limit,
    };
  });
}
