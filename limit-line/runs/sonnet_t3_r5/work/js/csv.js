const FIELDS = ['date', 'description', 'amount', 'category'];

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const src = text.replace(/^﻿/, '');

  while (i < src.length) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
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
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

export function parseCSV(text) {
  const rows = parseRows(String(text));
  if (rows.length === 0) return [];

  let cols = [0, 1, 2, 3];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  if (head.includes('date') && head.includes('amount')) {
    rows.shift();
    cols = FIELDS.map((f) => head.indexOf(f));
  }

  const items = [];
  for (const r of rows) {
    const get = (k) => (cols[k] >= 0 && r[cols[k]] !== undefined ? r[cols[k]].trim() : '');
    const amount = parseFloat(get(2));
    if (Number.isNaN(amount)) continue;
    items.push({ date: get(0), description: get(1), amount, category: get(3) });
  }
  return items;
}

function escapeField(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = [FIELDS.join(',')];
  for (const it of items) {
    lines.push(FIELDS.map((f) => escapeField(it[f])).join(','));
  }
  return lines.join('\n') + '\n';
}
