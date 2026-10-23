function formatDate(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function expandRecurring(rule, until) {
  if (!['week', 'month'].includes(rule.every)) throw new TypeError('every must be "week" or "month"');
  if (!rule.date || !until || rule.date > until) return [];
  const result = [];
  const start = new Date(`${rule.date}T00:00:00Z`);
  const originalDay = start.getUTCDate();
  let index = 0;
  while (true) {
    let date;
    if (rule.every === 'week') {
      const next = new Date(start);
      next.setUTCDate(start.getUTCDate() + 7 * index);
      date = formatDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
    } else {
      const monthIndex = start.getUTCFullYear() * 12 + start.getUTCMonth() + index;
      const year = Math.floor(monthIndex / 12), month = monthIndex % 12;
      const day = Math.min(originalDay, new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
      date = formatDate(year, month + 1, day);
    }
    if (date > until) break;
    const { every, ...item } = rule;
    result.push({ ...item, date });
    index++;
  }
  return result;
}
