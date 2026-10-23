export function checkBudgets(items, budgets, month) {
  const start = `${month}-01`;
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  return budgets.map(budget => {
    const spent = items.reduce((sum, item) => item.category === budget.category && item.date >= start && item.date <= last && Number(item.amount) < 0 ? sum + Math.abs(Number(item.amount)) : sum, 0);
    return { category: budget.category, limit: Number(budget.limit), spent, over: spent > Number(budget.limit) };
  });
}
