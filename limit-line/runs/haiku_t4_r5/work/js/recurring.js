// Expands a recurring rule into one transaction per occurrence.

function formatDate(year, monthIndex, day) {
  const y = String(year).padStart(4, '0');
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function expandRecurring(rule, until) {
  const [year, month, day] = rule.date.split('-').map(Number);
  const startMonth = month - 1;
  const occurrences = [];

  for (let k = 0; ; k++) {
    let date;
    if (rule.every === 'week') {
      const d = new Date(Date.UTC(year, startMonth, day + 7 * k));
      date = formatDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    } else if (rule.every === 'month') {
      // Count months from the original start so a clamped day (e.g. Feb 28)
      // does not shift later occurrences (Mar 31 stays on the 31st).
      const total = startMonth + k;
      const y = year + Math.floor(total / 12);
      const m = total % 12;
      date = formatDate(y, m, Math.min(day, daysInMonth(y, m)));
    } else {
      throw new Error(`Unsupported repeat: ${rule.every}`);
    }

    if (date > until) break;

    occurrences.push({
      date,
      description: rule.description,
      amount: rule.amount,
      category: rule.category,
    });
  }

  return occurrences;
}
