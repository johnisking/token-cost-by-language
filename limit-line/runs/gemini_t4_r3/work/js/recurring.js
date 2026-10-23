function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

function formatDate(y, m, d) {
  const ys = String(y).padStart(4, '0');
  const ms = String(m).padStart(2, '0');
  const ds = String(d).padStart(2, '0');
  return `${ys}-${ms}-${ds}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function expandRecurring(rule, until) {
  const { date, description, amount, category, every } = rule;
  if (!date || !until || date > until) {
    return [];
  }

  const results = [];
  const start = parseDate(date);

  if (every === 'week') {
    let current = new Date(Date.UTC(start.y, start.m - 1, start.d));
    while (true) {
      const currentStr = formatDate(
        current.getUTCFullYear(),
        current.getUTCMonth() + 1,
        current.getUTCDate()
      );
      if (currentStr > until) break;
      results.push({
        date: currentStr,
        description,
        amount: Number(amount),
        category
      });
      current.setUTCDate(current.getUTCDate() + 7);
    }
  } else if (every === 'month') {
    let year = start.y;
    let month = start.m;
    const origDay = start.d;

    while (true) {
      const maxDay = daysInMonth(year, month);
      const day = Math.min(origDay, maxDay);
      const currentStr = formatDate(year, month, day);
      if (currentStr > until) break;

      results.push({
        date: currentStr,
        description,
        amount: Number(amount),
        category
      });

      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
  } else {
    results.push({
      date,
      description,
      amount: Number(amount),
      category
    });
  }

  return results;
}
