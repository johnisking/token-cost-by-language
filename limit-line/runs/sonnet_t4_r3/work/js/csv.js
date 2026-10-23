const COLUMNS = ['date', 'description', 'amount', 'category'];

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const s = String(text).replace(/^﻿/, '');
  const endRow = () => {
    row.push(field);
    field = '';
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
  };
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"' && field === '') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      if (s[i + 1] === '\n') i++;
      endRow();
    } else if (c === '\n') {
      endRow();
    } else {
      field += c;
    }
    i++;
  }
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

export function parseCSV(text) {
  const rows = parseRows(text);
  if (rows.length === 0) return [];
  let index = [0, 1, 2, 3];
  const first = rows[0].map((h) => h.trim().toLowerCase());
  if (first.includes('date') && first.includes('amount')) {
    index = COLUMNS.map((name) => first.indexOf(name));
    rows.shift();
  }
  return rows.map((r) => {
    const get = (k) => (index[k] >= 0 && index[k] < r.length ? r[index[k]] : '');
    return {
      date: get(0).trim(),
      description: get(1),
      amount: Number(get(2).trim()),
      category: get(3),
    };
  });
}

function quote(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = [COLUMNS.join(',')];
  for (const it of items) {
    lines.push([it.date, it.description, it.amount, it.category].map(quote).join(','));
  }
  return lines.join('\n') + '\n';
}
