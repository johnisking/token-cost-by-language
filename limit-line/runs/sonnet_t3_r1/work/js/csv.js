const HEADER = ['date', 'description', 'amount', 'category'];

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  text = String(text).replace(/^﻿/, '');

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
    i++;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  const rows = parseRows(text);
  if (rows.length === 0) return [];

  const first = rows[0].map(c => c.trim().toLowerCase());
  let cols = [0, 1, 2, 3];
  if (first.includes('date') && first.includes('amount')) {
    cols = HEADER.map(name => first.indexOf(name));
    rows.shift();
  }

  return rows.map(r => {
    const get = k => (cols[k] >= 0 && r[cols[k]] !== undefined ? r[cols[k]].trim() : '');
    const amount = parseFloat(get(2));
    return {
      date: get(0),
      description: get(1),
      amount: Number.isFinite(amount) ? amount : 0,
      category: get(3),
    };
  });
}

function escapeField(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const it of items) {
    lines.push([it.date, it.description, it.amount, it.category].map(escapeField).join(','));
  }
  return lines.join('\n') + '\n';
}
