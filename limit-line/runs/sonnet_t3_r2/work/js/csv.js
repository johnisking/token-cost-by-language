function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');
  const rows = parseRows(text);
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  const idx = k => header.indexOf(k);
  const start = header.includes('date') && header.includes('amount') ? 1 : 0;
  const cols = start
    ? { date: idx('date'), description: idx('description'), amount: idx('amount'), category: idx('category') }
    : { date: 0, description: 1, amount: 2, category: 3 };
  const get = (r, i) => (i >= 0 && r[i] !== undefined ? r[i] : '');
  return rows.slice(start).map(r => ({
    date: get(r, cols.date).trim(),
    description: get(r, cols.description),
    amount: parseFloat(get(r, cols.amount)) || 0,
    category: get(r, cols.category).trim(),
  }));
}

function quote(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = ['date,description,amount,category'];
  for (const t of items) {
    lines.push([t.date, t.description, t.amount, t.category].map(quote).join(','));
  }
  return lines.join('\n') + '\n';
}
