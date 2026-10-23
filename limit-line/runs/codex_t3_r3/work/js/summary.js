export function summarize(items) {
  const result = { income: 0, expense: 0, balance: 0, byCategory: {} };
  for (const item of items) {
    const amount = Number(item.amount) || 0;
    if (amount > 0) result.income += amount;
    else if (amount < 0) result.expense += Math.abs(amount);
    const category = String(item.category ?? '');
    result.byCategory[category] = (result.byCategory[category] || 0) + amount;
  }
  result.balance = result.income - result.expense;
  return result;
}
