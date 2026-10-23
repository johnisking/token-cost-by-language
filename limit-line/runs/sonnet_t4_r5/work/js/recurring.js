const pad = (n, w) => String(n).padStart(w, '0');
const fmt = (y, m, d) => `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const MAX = 20000;

export function expandRecurring(rule, until) {
  const { every, ...base } = rule;
  const [y, m, d] = rule.date.split('-').map(Number);
  const out = [];
  for (let k = 0; k < MAX; k++) {
    let date;
    if (every === 'week') {
      const t = new Date(Date.UTC(y, m - 1, d + 7 * k));
      date = fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
    } else if (every === 'month') {
      const total = m - 1 + k;
      const yy = y + Math.floor(total / 12);
      const mm = (total % 12) + 1;
      date = fmt(yy, mm, Math.min(d, daysIn(yy, mm)));
    } else {
      if (k > 0) break;
      date = rule.date;
    }
    if (date > until) break;
    out.push({ ...base, date });
  }
  return out;
}
