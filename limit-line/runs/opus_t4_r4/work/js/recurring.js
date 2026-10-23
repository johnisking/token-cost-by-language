const pad = n => String(n).padStart(2, '0');
const fmt = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based

export function expandRecurring(rule, until) {
  const { every, ...base } = rule;
  const [y, m, d] = rule.date.split('-').map(Number);
  const out = [];
  if (!until || rule.date > until) return out;
  if (every === 'week') {
    let t = Date.UTC(y, m - 1, d);
    for (;;) {
      const dt = new Date(t);
      const s = fmt(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
      if (s > until) break;
      out.push({ ...base, date: s });
      t += 7 * 86400000;
    }
  } else if (every === 'month') {
    for (let i = 0; ; i++) {
      const total = (m - 1) + i;
      const yy = y + Math.floor(total / 12);
      const mm = (total % 12) + 1;
      const s = fmt(yy, mm, Math.min(d, daysInMonth(yy, mm)));
      if (s > until) break;
      out.push({ ...base, date: s });
    }
  } else {
    out.push({ ...base });
  }
  return out;
}
