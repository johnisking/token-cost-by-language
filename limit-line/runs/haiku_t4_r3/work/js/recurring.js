const pad = (n) => String(n).padStart(2, '0');

const formatDate = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;

// Adds whole days to a YYYY-MM-DD string using UTC so time zones cannot shift the date.
function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return formatDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

// monthIndex counts months from January of `year`; the day is clamped to the month's last day.
function monthlyDate(year, month, day, monthIndex) {
  const y = year + Math.floor(monthIndex / 12);
  const m = monthIndex % 12; // 0-based
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return formatDate(y, m + 1, Math.min(day, lastDay));
}

export function expandRecurring(rule, until) {
  const { date, description, amount, category, every } = rule;
  if (!until) return [];
  if (every !== 'week' && every !== 'month') {
    throw new Error(`Unknown repeat: ${every}`);
  }

  const [year, month, day] = date.split('-').map(Number);
  const result = [];
  for (let n = 0; ; n++) {
    const occurrence =
      every === 'week' ? addDays(date, 7 * n) : monthlyDate(year, month, day, month - 1 + n);
    if (occurrence > until) break;
    result.push({ date: occurrence, description, amount, category });
  }
  return result;
}
