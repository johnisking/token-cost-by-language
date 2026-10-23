function addMonths(dateString, offset, originalDay) {
  const [year, month] = dateString.split('-').map(Number);
  const absolute = year * 12 + (month - 1) + offset;
  const targetYear = Math.floor(absolute / 12), targetMonth = absolute % 12;
  const day = Math.min(originalDay, new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate());
  return `${String(targetYear).padStart(4, '0')}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function expandRecurring(rule, until) {
  if (!['week', 'month'].includes(rule.every)) throw new Error('every must be "week" or "month"');
  const result = [];
  const originalDay = Number(rule.date.slice(-2));
  for (let index = 0; ; index++) {
    const date = rule.every === 'week'
      ? new Date(Date.parse(`${rule.date}T00:00:00Z`) + index * 7 * 86400000).toISOString().slice(0, 10)
      : addMonths(rule.date, index, originalDay);
    if (date > until) break;
    const { every, ...item } = rule;
    result.push({ ...item, date });
  }
  return result;
}
