function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function expandRecurring(rule, until) {
  if (!rule || !rule.date) return [];
  const { date, description, amount, category, every } = rule;

  const baseItem = () => ({
    date,
    description,
    amount: Number(amount),
    category,
  });

  if (!every || every === 'none') {
    if (until && date > until) return [];
    return [baseItem()];
  }

  if (!until || date > until) {
    return [];
  }

  const results = [];
  const start = parseDate(date);

  if (every === 'week') {
    let current = new Date(Date.UTC(start.year, start.month - 1, start.day));
    while (true) {
      const y = current.getUTCFullYear();
      const m = current.getUTCMonth() + 1;
      const d = current.getUTCDate();
      const curStr = formatDate(y, m, d);
      if (curStr > until) break;
      results.push({
        date: curStr,
        description,
        amount: Number(amount),
        category,
      });
      current.setUTCDate(current.getUTCDate() + 7);
    }
  } else if (every === 'month') {
    let year = start.year;
    let month = start.month;
    const targetDay = start.day;

    while (true) {
      const maxDay = daysInMonth(year, month);
      const day = Math.min(targetDay, maxDay);
      const curStr = formatDate(year, month, day);
      if (curStr > until) break;
      results.push({
        date: curStr,
        description,
        amount: Number(amount),
        category,
      });
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
  }

  return results;
}
