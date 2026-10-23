const pad = (n) => String(n).padStart(2, '0');
const format = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based

function parse(date) {
  const [y, m, d] = String(date).split('-').map(Number);
  return { y, m, d };
}

export function expandRecurring(rule, until) {
  const { every, ...base } = rule;
  const result = [];
  if (!rule.date || !until) return result;
  const start = parse(rule.date);
  if ([start.y, start.m, start.d].some(Number.isNaN)) return result;

  if (every === 'week') {
    const t = new Date(Date.UTC(start.y, start.m - 1, start.d));
    for (;;) {
      const date = format(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
      if (date > until) break;
      result.push({ ...base, date });
      t.setUTCDate(t.getUTCDate() + 7);
    }
  } else if (every === 'month') {
    for (let k = 0; ; k++) {
      const total = start.m - 1 + k;
      const y = start.y + Math.floor(total / 12);
      const m = (total % 12) + 1;
      const date = format(y, m, Math.min(start.d, daysInMonth(y, m)));
      if (date > until) break;
      result.push({ ...base, date });
    }
  } else if (rule.date <= until) {
    result.push({ ...base });
  }
  return result;
}
