// Totals for a list of transactions.

// Rounds to cents and turns -0 into 0.
export function roundCents(value) {
  return Math.sign(value) * Math.round(Math.abs(value) * 100) / 100 + 0;
}

// Inclusive first and last date of a "YYYY-MM" month.
export function monthRange(month) {
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

// range is optional {from, to}; both ends are inclusive YYYY-MM-DD dates.
export function summarize(items, range = {}) {
  const from = range?.from;
  const to = range?.to;
  let income = 0;
  let expense = 0;
  const byCategory = {};

  for (const item of items) {
    if (from && item.date < from) continue;
    if (to && item.date > to) continue;

    if (item.amount > 0) {
      income += item.amount;
    } else if (item.amount < 0) {
      expense -= item.amount;
    }

    const previous = Object.prototype.hasOwnProperty.call(byCategory, item.category)
      ? byCategory[item.category]
      : 0;
    byCategory[item.category] = previous + item.amount;
  }

  for (const category of Object.keys(byCategory)) {
    byCategory[category] = roundCents(byCategory[category]);
  }

  income = roundCents(income);
  expense = roundCents(expense);
  return {
    income,
    expense,
    balance: roundCents(income - expense),
    byCategory,
  };
}
