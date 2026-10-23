function parseDate(text) {
  const [year, month, day] = text.split('-').map(Number);
  return { year, month, day };
}

function formatDate(year, month, day) {
  return [
    String(year).padStart(4, '0'),
    String(month + 1).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// Expands a recurring rule into one transaction per occurrence from rule.date
// up to and including `until`. Monthly rules use the last day of the month
// when the start day does not exist in a later month.
export function expandRecurring(rule, until) {
  const { date, description, amount, category, every } = rule;
  if (every !== 'week' && every !== 'month') {
    throw new Error(`Unknown recurrence: ${every}`);
  }

  const start = parseDate(date);
  const items = [];

  for (let k = 0; ; k++) {
    let occurrence;
    if (every === 'week') {
      const time = Date.UTC(start.year, start.month - 1, start.day + 7 * k);
      const d = new Date(time);
      occurrence = formatDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    } else {
      const monthIndex = start.month - 1 + k;
      const year = start.year + Math.floor(monthIndex / 12);
      const month = ((monthIndex % 12) + 12) % 12;
      const day = Math.min(start.day, daysInMonth(year, month));
      occurrence = formatDate(year, month, day);
    }

    if (occurrence > until) break;
    items.push({ date: occurrence, description, amount, category });
  }

  return items;
}
