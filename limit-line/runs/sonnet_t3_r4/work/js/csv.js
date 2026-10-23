function splitRows(text) {
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
  return rows;
}

export function parseCSV(text) {
  const rows = splitRows(text.replace(/^﻿/, ''))
    .filter(r => r.some(f => f.trim() !== ''));
  if (!rows.length) return [];
  const first = rows[0].map(h => h.trim().toLowerCase());
  const hasHeader = first.includes('date') && first.includes('amount');
  const idx = hasHeader
    ? name => first.indexOf(name)
    : name => ['date', 'description', 'amount', 'category'].indexOf(name);
  const data = hasHeader ? rows.slice(1) : rows;
  return data.map(r => ({
    date: (r[idx('date')] ?? '').trim(),
    description: (r[idx('description')] ?? '').trim(),
    amount: parseFloat(r[idx('amount')]) || 0,
    category: (r[idx('category')] ?? '').trim(),
  }));
}

function quote(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = ['date,description,amount,category'];
  for (const it of items) {
    lines.push([it.date, it.description, it.amount, it.category].map(quote).join(','));
  }
  return lines.join('\n') + '\n';
}
