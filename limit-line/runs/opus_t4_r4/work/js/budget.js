import { round2 } from './summary.js';

export function checkBudgets(items, budgets, month) {
  return (budgets || []).map(b => {
    let spent = 0;
    for (const it of items || []) {
      const amount = Number(it.amount) || 0;
      if (it.category === b.category && amount < 0 && String(it.date).slice(0, 7) === month) {
        spent -= amount;
      }
    }
    spent = round2(spent);
    const limit = Number(b.limit);
    return { category: b.category, limit, spent, over: spent > limit };
  });
}
