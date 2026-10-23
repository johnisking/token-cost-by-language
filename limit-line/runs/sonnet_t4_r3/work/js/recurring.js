const pad = (n, w = 2) => String(n).padStart(w, '0');
const fmt = (d) => `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function expandRecurring(rule, until) {
  const { every, ...base } = rule;
  const [y, m, d] = rule.date.split('-').map(Number);
  const out = [];
  for (let k = 0; k < 20000; k++) {
    let date;
    if (every === 'week') {
      date = fmt(new Date(Date.UTC(y, m - 1, d + 7 * k)));
    } else if (every === 'month') {
      const total = y * 12 + (m - 1) + k;
      const yy = Math.floor(total / 12);
      const mm = total % 12;
      const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
      date = `${pad(yy, 4)}-${pad(mm + 1)}-${pad(Math.min(d, last))}`;
    } else if (k === 0) {
      date = rule.date;
    } else {
      break;
    }
    if (date > until) break;
    out.push({ ...base, date });
  }
  return out;
}
