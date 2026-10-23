/**
 * Summarizes an array of transactions.
 * @param {Array<{date?: string, description?: string, amount: number, category: string}>} items
 * @returns {{income: number, expense: number, balance: number, byCategory: Record<string, number>}}
 */
export function summarize(items) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  if (!Array.isArray(items)) {
    return { income: 0, expense: 0, balance: 0, byCategory: {} };
  }

  for (const item of items) {
    const amount = Number(item.amount) || 0;
    const category = item.category || 'Uncategorized';

    if (amount > 0) {
      income += amount;
    } else if (amount < 0) {
      expense += Math.abs(amount);
    }

    byCategory[category] = (byCategory[category] || 0) + amount;
  }

  const balance = income - expense;

  return {
    income,
    expense,
    balance,
    byCategory,
  };
}
