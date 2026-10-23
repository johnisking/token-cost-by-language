// Compare spending per category against monthly budgets.
import { round2 } from './summary.js';

export function monthExpenses(items, month) {
  const spent = {};
  for (const item of items || []) {
    if (!String(item.date).startsWith(month + '-')) continue;
    const amount = Number(item.amount) || 0;
    if (amount < 0) spent[item.category] = (spent[item.category] || 0) - amount;
  }
  for (const key of Object.keys(spent)) spent[key] = round2(spent[key]);
  return spent;
}

export function checkBudgets(items, budgets, month) {
  const spentBy = monthExpenses(items, month);
  return (budgets || []).map(({ category, limit }) => {
    const spent = spentBy[category] || 0;
    return { category, limit, spent, over: spent > limit };
  });
}
