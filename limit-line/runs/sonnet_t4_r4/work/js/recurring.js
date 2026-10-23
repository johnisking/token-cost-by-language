const pad = (n, w = 2) => String(n).padStart(w, '0');

export function expandRecurring(rule, until) {
  const { every, ...base } = rule;
  const [y, m, d] = rule.date.split('-').map(Number);
  const out = [];
  for (let n = 0; n < 100000; n++) {
    let date;
    if (every === 'week') {
      date = new Date(Date.UTC(y, m - 1, d + 7 * n)).toISOString().slice(0, 10);
    } else if (every === 'month') {
      const total = m - 1 + n;
      const yy = y + Math.floor(total / 12);
      const mm = total % 12;
      const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
      date = `${pad(yy, 4)}-${pad(mm + 1)}-${pad(Math.min(d, last))}`;
    } else {
      if (rule.date <= until) out.push({ ...base });
      break;
    }
    if (date > until) break;
    out.push({ ...base, date });
  }
  return out;
}
