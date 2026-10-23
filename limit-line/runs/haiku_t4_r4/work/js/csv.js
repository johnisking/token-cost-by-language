// CSV reading and writing for transactions.
// Header row: date,description,amount,category

const HEADER = ['date', 'description', 'amount', 'category'];

// Splits CSV text into rows of fields. Handles quoted fields, doubled quotes,
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
    } else if (ch === '"') {
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

  // Last row without a trailing line break.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseCSV(text) {
  const rows = parseRows(String(text).replace(/^﻿/, ''));
  if (rows.length === 0) return [];

  const header = rows[0].map((name) => name.trim());
  const column = (name) => {
    const found = header.indexOf(name);
    return found === -1 ? HEADER.indexOf(name) : found;
  };
  const dateCol = column('date');
  const descriptionCol = column('description');
  const amountCol = column('amount');
  const categoryCol = column('category');

  return rows
    .slice(1)
    .filter((fields) => !(fields.length === 1 && fields[0] === ''))
    .map((fields) => {
      const amountText = (fields[amountCol] ?? '').trim();
      return {
        date: (fields[dateCol] ?? '').trim(),
        description: fields[descriptionCol] ?? '',
        amount: amountText === '' ? NaN : Number(amountText),
        category: (fields[categoryCol] ?? '').trim(),
      };
    });
}

function escapeField(value) {
  const text = String(value);
  const needsQuotes = /[",\r\n]/.test(text) || /^\s|\s$/.test(text);
  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const item of items) {
    lines.push(HEADER.map((key) => escapeField(item[key] ?? '')).join(','));
  }
  return lines.join('\n') + '\n';
}
