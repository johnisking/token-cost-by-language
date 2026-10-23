// Compares monthly spending per category against budget limits.

function round2(n) {
  return Math.round(n * 100) / 100;
}

// budgets: [{category, limit}], month: "YYYY-MM"
export function checkBudgets(items, budgets, month) {
  return budgets.map(({ category, limit }) => {
    let spent = 0;
    for (const item of items) {
      if (item.category !== category) continue;
      if (item.date.slice(0, 7) !== month) continue;
      if (item.amount < 0) spent += -item.amount;
    }
    spent = round2(spent);
    return { category, limit, spent, over: spent > limit };
  });
}
