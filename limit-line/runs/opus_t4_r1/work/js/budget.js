import { round2 } from './summary.js';

export function checkBudgets(items, budgets, month) {
  const spentBy = {};
  for (const item of items || []) {
    const amount = Number(item.amount) || 0;
    if (amount < 0 && String(item.date).slice(0, 7) === month) {
      spentBy[item.category] = (spentBy[item.category] || 0) - amount;
    }
  }
  return (budgets || []).map(({ category, limit }) => {
    const spent = round2(spentBy[category] || 0);
    return { category, limit, spent, over: spent > limit };
  });
}
