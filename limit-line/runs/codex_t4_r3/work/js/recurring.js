function addMonthsClamped(date, offset, desiredDay) {
  const year = date.getUTCFullYear(), month = date.getUTCMonth() + offset;
  const first = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(desiredDay, lastDay));
  return first;
}

export function expandRecurring(rule, until) {
  const start = new Date(`${rule.date}T00:00:00Z`);
  const end = new Date(`${until}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return [];
  const occurrences = [], day = start.getUTCDate();
  for (let n = 0; ; n++) {
    let date;
    if (rule.every === 'week') {
      date = new Date(start); date.setUTCDate(date.getUTCDate() + n * 7);
    } else if (rule.every === 'month') date = addMonthsClamped(start, n, day);
    else return [];
    if (date > end) break;
    occurrences.push({ date: date.toISOString().slice(0, 10), description: rule.description, amount: Number(rule.amount), category: rule.category });
  }
  return occurrences;
}
