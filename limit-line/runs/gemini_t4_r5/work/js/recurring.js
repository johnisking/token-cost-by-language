function parseYMD(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

function formatYMD(y, m, d) {
  const yyyy = String(y).padStart(4, '0');
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function expandRecurring(rule, until) {
  const { date, description, amount, category, every } = rule;
  if (!until || date > until) {
    return [];
  }

  if (!every || every === 'none') {
    return [{ date, description, amount, category }];
  }

  const items = [];
  const start = parseYMD(date);

  if (every === 'week') {
    let curTime = Date.UTC(start.y, start.m - 1, start.d);
    const endParts = parseYMD(until);
    const endTime = Date.UTC(endParts.y, endParts.m - 1, endParts.d);
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    while (curTime <= endTime) {
      const dt = new Date(curTime);
      const curDate = formatYMD(
        dt.getUTCFullYear(),
        dt.getUTCMonth() + 1,
        dt.getUTCDate()
      );
      items.push({ date: curDate, description, amount, category });
      curTime += weekMs;
    }
  } else if (every === 'month') {
    let step = 0;
    while (true) {
      const totalMonths = (start.m - 1) + step;
      const y = start.y + Math.floor(totalMonths / 12);
      const m = (totalMonths % 12) + 1;
      const maxDay = daysInMonth(y, m);
      const d = Math.min(start.d, maxDay);
      const curDate = formatYMD(y, m, d);

      if (curDate > until) break;

      items.push({ date: curDate, description, amount, category });
      step++;
    }
  }

  return items;
}
