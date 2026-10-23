export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  text = String(text ?? '').replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length || (text.length && !/[\r\n]$/.test(text))) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows.shift().map(h => h.trim().toLowerCase());
  return rows.filter(r => r.some(v => v !== '')).map(r => {
    const obj = Object.fromEntries(headers.map((h, i) => [h, r[i] ?? '']));
    return { date: obj.date, description: obj.description, amount: Number(obj.amount), category: obj.category };
  });
}

export function toCSV(items) {
  const quote = value => {
    const s = String(value ?? '');
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return ['date,description,amount,category', ...items.map(x => [x.date, x.description, x.amount, x.category].map(quote).join(','))].join('\r\n');
}
