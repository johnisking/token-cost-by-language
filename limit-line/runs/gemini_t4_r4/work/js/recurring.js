function parseDateParts(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function formatDateParts(year, month, day) {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function expandRecurring(rule, until) {
  const { date, description, amount, category, every } = rule;
  if (!date || !until || date > until) {
    return [];
  }

  const results = [];
  const startParts = parseDateParts(date);

  if (every === 'week') {
    let currentUTC = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
    const untilParts = parseDateParts(until);
    const untilUTC = Date.UTC(untilParts.year, untilParts.month - 1, untilParts.day);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;

    while (currentUTC <= untilUTC) {
      const dt = new Date(currentUTC);
      const dateStr = formatDateParts(
        dt.getUTCFullYear(),
        dt.getUTCMonth() + 1,
        dt.getUTCDate()
      );
      results.push({
        date: dateStr,
        description,
        amount: Number(amount),
        category,
      });
      currentUTC += msPerWeek;
    }
  } else if (every === 'month') {
    let year = startParts.year;
    let month = startParts.month;
    const targetDay = startParts.day;

    while (true) {
      const maxDay = daysInMonth(year, month);
      const actualDay = Math.min(targetDay, maxDay);
      const currentStr = formatDateParts(year, month, actualDay);

      if (currentStr > until) {
        break;
      }

      results.push({
        date: currentStr,
        description,
        amount: Number(amount),
        category,
      });

      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  } else {
    results.push({
      date,
      description,
      amount: Number(amount),
      category,
    });
  }

  return results;
}
