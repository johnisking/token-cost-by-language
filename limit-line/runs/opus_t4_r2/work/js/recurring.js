const pad = n => String(n).padStart(2, '0');
const fmt = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function expandRecurring(rule, until) {
  const { every, ...base } = rule;
  const [y, m, d] = rule.date.split('-').map(Number);
  const out = [];
  if (!until || rule.date > until) return out;
  for (let n = 0; n < 100000; n++) {
    let date;
    if (every === 'week') {
      const t = new Date(Date.UTC(y, m - 1, d + 7 * n));
      date = fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
    } else if (every === 'month') {
      const total = (m - 1) + n;
      const yy = y + Math.floor(total / 12);
      const mm = (total % 12) + 1;
      date = fmt(yy, mm, Math.min(d, daysInMonth(yy, mm)));
    } else {
      date = rule.date;
    }
    if (date > until) break;
    out.push({ ...base, date });
    if (every !== 'week' && every !== 'month') break;
  }
  return out;
}
