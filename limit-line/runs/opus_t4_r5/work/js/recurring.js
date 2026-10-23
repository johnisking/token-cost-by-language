// Expand a recurring transaction rule into individual transactions.

function parseDate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return { y, m, d };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function formatDate(y, m, d) {
  return `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
}

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function expandRecurring(rule, until) {
  const { every, ...base } = rule;
  const items = [];
  if (!rule.date || !until || rule.date > until) return items;
  const start = parseDate(rule.date);

  if (every === 'week') {
    const t = new Date(Date.UTC(start.y, start.m - 1, start.d));
    for (;;) {
      const date = formatDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
      if (date > until) break;
      items.push({ ...base, date });
      t.setUTCDate(t.getUTCDate() + 7);
    }
  } else if (every === 'month') {
    for (let i = 0; ; i++) {
      const total = start.m - 1 + i;
      const y = start.y + Math.floor(total / 12);
      const m = (total % 12) + 1;
      const date = formatDate(y, m, Math.min(start.d, daysInMonth(y, m)));
      if (date > until) break;
      items.push({ ...base, date });
    }
  } else {
    items.push({ ...base });
  }
  return items;
}
