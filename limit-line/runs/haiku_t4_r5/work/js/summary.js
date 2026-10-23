// Totals for a list of transactions. Positive amounts are income,
// negative amounts are expenses.

// Rounds to cents so that sums like 0.1 + 0.2 come out as 0.3.
function round2(n) {
  return Math.round(n * 100) / 100;
}

export function summarize(items, range) {
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const item of items) {
    if (range) {
      if (range.from && item.date < range.from) continue;
      if (range.to && item.date > range.to) continue;
    }

    const amount = Number(item.amount);
    if (amount > 0) {
      income += amount;
    } else if (amount < 0) {
      expense += -amount;
    }
    byCategory[item.category] = (byCategory[item.category] || 0) + amount;
  }

  for (const category of Object.keys(byCategory)) {
    byCategory[category] = round2(byCategory[category]);
  }

  income = round2(income);
  expense = round2(expense);

  return {
    income,
    expense,
    balance: round2(income - expense),
    byCategory,
  };
}
