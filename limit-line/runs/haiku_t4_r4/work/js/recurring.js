// Expands a recurring rule into individual transactions.

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(text) {
  const [year, month, day] = text.split('-').map(Number);
  return { year, month, day };
}

function formatDate(year, month, day) {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// rule: {date, description, amount, category, every: "week" | "month"}
// Returns one item per occurrence from rule.date up to and including until.
export function expandRecurring(rule, until) {
  const { every, ...base } = rule;
  const dates = [];

  if (every === 'week') {
    let time = Date.UTC(...dateParts(rule.date));
    for (;;) {
      const date = isoFromUTC(time);
      if (date > until) break;
      dates.push(date);
      time += 7 * DAY_MS;
    }
  } else if (every === 'month') {
    const start = parseDate(rule.date);
    for (let i = 0; ; i++) {
      // Always count from the original start so a short month does not shift later dates.
      const total = start.month - 1 + i;
      const year = start.year + Math.floor(total / 12);
      const monthIndex = total % 12;
      const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
      const date = formatDate(year, monthIndex + 1, Math.min(start.day, lastDay));
      if (date > until) break;
      dates.push(date);
    }
  } else {
    throw new Error(`Unknown recurrence: ${every}`);
  }

  return dates.map((date) => ({ ...base, date }));
}

function dateParts(text) {
  const { year, month, day } = parseDate(text);
  return [year, month - 1, day];
}

function isoFromUTC(time) {
  const d = new Date(time);
  return formatDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}
