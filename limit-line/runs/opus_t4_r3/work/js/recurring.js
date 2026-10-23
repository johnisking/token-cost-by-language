const pad = n => String(n).padStart(2, '0');

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

function format(y, m, d) {
  return `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
}

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function expandRecurring(rule, until) {
  const { every, ...base } = rule;
  const out = [];
  if (!rule.date || !until || rule.date > until) return out;
  const start = parseDate(rule.date);
  if (every === 'week') {
    const t0 = Date.UTC(start.y, start.m - 1, start.d);
    for (let k = 0; ; k++) {
      const dt = new Date(t0 + k * 7 * 86400000);
      const date = format(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
      if (date > until) break;
      out.push({ ...base, date });
    }
  } else if (every === 'month') {
    for (let k = 0; ; k++) {
      const total = start.m - 1 + k;
      const y = start.y + Math.floor(total / 12);
      const m = (total % 12) + 1;
      const date = format(y, m, Math.min(start.d, daysInMonth(y, m)));
      if (date > until) break;
      out.push({ ...base, date });
    }
  } else {
    out.push({ ...base });
  }
  return out;
}
