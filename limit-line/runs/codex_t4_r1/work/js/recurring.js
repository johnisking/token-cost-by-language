function utcDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== value) throw new Error(`Invalid date: ${value}`);
  return date;
}

export function expandRecurring(rule, until) {
  if (rule.every !== 'week' && rule.every !== 'month') throw new Error('every must be "week" or "month".');
  const start = utcDate(rule.date), end = utcDate(until), out = [];
  if (end < start) return out;
  const originalDay = start.getUTCDate();
  for (let index = 0; ; index++) {
    let date;
    if (rule.every === 'week') {
      date = new Date(start.getTime() + index * 7 * 86400000);
    } else {
      const monthIndex = start.getUTCFullYear() * 12 + start.getUTCMonth() + index;
      const year = Math.floor(monthIndex / 12), month = monthIndex % 12;
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      date = new Date(Date.UTC(year, month, Math.min(originalDay, lastDay)));
    }
    const dateString = date.toISOString().slice(0, 10);
    if (dateString > until) break;
    const { every, ...item } = rule;
    out.push({ ...item, date: dateString });
  }
  return out;
}
