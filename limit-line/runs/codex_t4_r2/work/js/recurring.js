export function expandRecurring(rule, until) {
  const out = [];
  const [year, month, day] = rule.date.split('-').map(Number);
  for (let n = 0; ; n++) {
    let date;
    if (rule.every === 'week') {
      const d = new Date(Date.UTC(year, month - 1, day + 7 * n));
      date = d.toISOString().slice(0, 10);
    } else if (rule.every === 'month') {
      const total = year * 12 + (month - 1) + n;
      const y = Math.floor(total / 12), m = total % 12;
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      date = `${String(y).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`;
    } else throw new Error('every must be "week" or "month"');
    if (date > until) break;
    out.push({ date, description: rule.description, amount: Number(rule.amount), category: rule.category });
  }
  return out;
}
