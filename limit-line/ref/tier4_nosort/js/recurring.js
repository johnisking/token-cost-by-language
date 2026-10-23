const pad = n => String(n).padStart(2, '0');
export function expandRecurring(rule, until) {
  const { every, ...base } = rule; const out = []; const [y0, m0, d0] = rule.date.split('-').map(Number);
  for (let k = 0; k < 1000; k++) { let date;
    if (every === 'week') { const t = new Date(Date.UTC(y0, m0 - 1, d0 + 7 * k)); date = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; }
    else { const mi = m0 - 1 + k, y = y0 + Math.floor(mi / 12), m = mi % 12; const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); date = `${y}-${pad(m + 1)}-${pad(Math.min(d0, last))}`; }
    if (date > until) break; out.push({ ...base, date }); }
  return out; }
