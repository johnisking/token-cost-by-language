const FIELDS = ['date', 'description', 'amount', 'category'];

// Split CSV text into rows of raw string fields (RFC 4180 style).
function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const s = String(text ?? '').replace(/^﻿/, '');

  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ',') {
      row.push(field);
      field = '';
      i++;
    } else if (c === '\r' || c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += c === '\r' && s[i + 1] === '\n' ? 2 : 1;
    } else {
      field += c;
      i++;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop blank lines.
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  const rows = parseRows(text);
  if (rows.length === 0) return [];

  let index = { date: 0, description: 1, amount: 2, category: 3 };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  let start = 0;
  if (FIELDS.every((f) => header.includes(f))) {
    index = Object.fromEntries(FIELDS.map((f) => [f, header.indexOf(f)]));
    start = 1;
  }

  return rows.slice(start).map((r) => {
    const raw = String(r[index.amount] ?? '').trim();
    const amount = raw === '' ? 0 : Number(raw);
    return {
      date: (r[index.date] ?? '').trim(),
      description: r[index.description] ?? '',
      amount: Number.isNaN(amount) ? 0 : amount,
      category: r[index.category] ?? '',
    };
  });
}

function quote(value) {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(items) {
  const lines = [FIELDS.join(',')];
  for (const item of items || []) {
    lines.push(FIELDS.map((f) => quote(item[f])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
