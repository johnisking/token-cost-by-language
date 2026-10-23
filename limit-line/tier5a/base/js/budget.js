export function checkBudgets(items, budgets, month) {
  const prefix = String(month || '');
  const monthItems = (items || []).filter(
    (item) => typeof item.date === 'string' && item.date.startsWith(prefix)
  );

  return (budgets || []).map((b) => {
    const category = b.category;
    const limit = Number(b.limit);
    let spent = 0;

    for (const item of monthItems) {
      if (item.category === category) {
        const amt = Number(item.amount) || 0;
        spent += Math.abs(amt);
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
