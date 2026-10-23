// Compares spending in one month against budget limits.
import { roundCents } from './summary.js';

// budgets: [{category, limit}], month: "YYYY-MM".
// Returns one entry per budget, in the same order.
export function checkBudgets(items, budgets, month) {
  const prefix = `${month}-`;

  return budgets.map(({ category, limit }) => {
    let spent = 0;
    for (const item of items) {
      if (item.category === category && item.amount < 0 && item.date.startsWith(prefix)) {
        spent -= item.amount;
      }
    }
    spent = roundCents(spent);
    return { category, limit, spent, over: spent > limit };
  });
}
