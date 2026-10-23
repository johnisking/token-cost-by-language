function parseYMD(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

function formatYMD(y, m, d) {
  const ys = String(y).padStart(4, '0');
  const ms = String(m).padStart(2, '0');
  const ds = String(d).padStart(2, '0');
  return `${ys}-${ms}-${ds}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function expandRecurring(rule, until) {
  if (!rule || !rule.date) return [];
  const { date, description, amount, category, every } = rule;

  if (!until || date > until) {
    return [];
  }

  const results = [];

  if (every === 'week') {
    const { y, m, d } = parseYMD(date);
    let current = new Date(Date.UTC(y, m - 1, d));
    while (true) {
      const curStr = formatYMD(
        current.getUTCFullYear(),
        current.getUTCMonth() + 1,
        current.getUTCDate()
      );
      if (curStr > until) break;
      results.push({
        date: curStr,
        description,
        amount: Number(amount),
        category,
      });
      current.setUTCDate(current.getUTCDate() + 7);
    }
  } else if (every === 'month') {
    const { y: startY, m: startM, d: startD } = parseYMD(date);
    let step = 0;
    while (true) {
      const totalMonths = startM - 1 + step;
      const curY = startY + Math.floor(totalMonths / 12);
      const curM = (totalMonths % 12) + 1;
      const maxD = daysInMonth(curY, curM);
      const curD = Math.min(startD, maxD);
      const curStr = formatYMD(curY, curM, curD);
      if (curStr > until) break;
      results.push({
        date: curStr,
        description,
        amount: Number(amount),
        category,
      });
      step++;
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
