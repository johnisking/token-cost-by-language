const pad = n => String(n).padStart(2, '0');
const fmt = (y, m, d) => `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function expandRecurring(rule, until) {
  const { every, ...base } = rule;
  const [y, m, d] = rule.date.split('-').map(Number);
  const out = [];
  for (let n = 0; n < 100000; n++) {
    let date;
    if (every === 'week') {
      const t = new Date(Date.UTC(y, m - 1, d + 7 * n));
      date = fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
    } else if (every === 'month') {
      const idx = m - 1 + n;
      const yy = y + Math.floor(idx / 12);
      const mm = (idx % 12) + 1;
      date = fmt(yy, mm, Math.min(d, daysIn(yy, mm)));
    } else {
      if (rule.date <= until) out.push({ ...base, date: rule.date });
      break;
    }
    if (date > until) break;
    out.push({ ...base, date });
  }
  return out;
}
