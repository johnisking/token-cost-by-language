const HEADER = ['date', 'description', 'amount', 'category'];

// Parses CSV text into rows of fields. Handles quoted fields, doubled quotes,
// commas and line breaks inside quotes, and both \n and \r\n line endings.
function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseCSV(text) {
  // Skip a leading byte order mark and blank lines.
  const bom = /^﻿/;
  const rows = parseRows(text.replace(bom, '')).filter((r) => !(r.length === 1 && r[0] === ''));
  if (rows.length === 0) return [];

  // Map columns by header name; fall back to the default order if a name is missing.
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = {};
  for (const name of HEADER) {
    const index = header.indexOf(name);
    col[name] = index === -1 ? HEADER.indexOf(name) : index;
  }
  const field = (row, name) => row[col[name]] ?? '';

  return rows.slice(1).map((row, n) => {
    const rawAmount = field(row, 'amount').trim();
    const amount = Number(rawAmount);
    if (rawAmount === '' || !Number.isFinite(amount)) {
      throw new Error(`Invalid amount on CSV row ${n + 2}: "${rawAmount}"`);
    }
    return {
      date: field(row, 'date').trim(),
      description: field(row, 'description'),
      amount,
      category: field(row, 'category').trim(),
    };
  });
}

function escapeField(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const item of items) {
    lines.push([item.date, item.description, item.amount, item.category].map(escapeField).join(','));
  }
  return lines.join('\n') + '\n';
}
