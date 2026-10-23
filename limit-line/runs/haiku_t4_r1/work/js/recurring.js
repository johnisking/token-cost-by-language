const DAY_MS = 24 * 60 * 60 * 1000;

// Returns one item per occurrence of a weekly or monthly rule, from rule.date
// up to and including `until`. The `every` field is left out of the items.
export function expandRecurring(rule, until) {
  const { every, ...base } = rule;
  if (every !== 'week' && every !== 'month') {
    throw new Error(`Unknown repeat interval: ${every}`);
  }

  const last = until || rule.date;
  const items = [];
  for (let i = 0; ; i++) {
    const date = every === 'week' ? nthWeek(rule.date, i) : nthMonth(rule.date, i);
    if (date > last) break;
    items.push({ ...base, date });
  }
  return items;
}

function nthWeek(start, n) {
  const time = Date.parse(`${start}T00:00:00Z`) + n * 7 * DAY_MS;
  return new Date(time).toISOString().slice(0, 10);
}

// Keeps the day of month, or uses the last day when the month is shorter.
function nthMonth(start, n) {
  const [year, month, day] = start.split('-').map(Number);
  const total = month - 1 + n;
  const y = year + Math.floor(total / 12);
  const m = total % 12;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d = Math.min(day, lastDay);
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}
