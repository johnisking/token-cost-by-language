function fmt(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function expandRecurring(rule, until) {
  const { every, ...base } = rule;
  const [y, m, d] = rule.date.split('-').map(Number);
  const out = [];
  for (let i = 0; i < 10000; i++) {
    let date;
    if (every === 'week') {
      date = fmt(Date.UTC(y, m - 1, d + 7 * i));
    } else if (every === 'month') {
      const total = m - 1 + i;
      const yy = y + Math.floor(total / 12);
      const mm = total % 12;
      const dim = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
      date = fmt(Date.UTC(yy, mm, Math.min(d, dim)));
    } else {
      date = rule.date;
      if (date <= until) out.push({ ...base, date });
      break;
    }
    if (date > until) break;
    out.push({ ...base, date });
  }
  return out;
}
