const HEADER = ['date', 'description', 'amount', 'category'];

// Splits CSV text into rows of raw string fields. Supports double-quoted
// fields, "" as an escaped quote, and newlines inside quoted fields.
function splitRows(text) {
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
    } else if (ch === '\n' || ch === '\r') {
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

// Parses CSV text with the header date,description,amount,category.
// The header row is skipped when present. Rows with a missing or
// non-numeric amount are skipped.
export function parseCSV(text) {
  // Strip a leading byte-order mark, which some spreadsheet exports add.
  const body = String(text).replace(/^﻿/, '');
  const rows = splitRows(body)
    .filter((row) => row.some((field) => field.trim() !== ''));

  if (rows.length && rows[0][0].trim().toLowerCase() === 'date') {
    rows.shift();
  }

  const items = [];
  for (const row of rows) {
    const [date = '', description = '', amountText = '', category = ''] =
      row.map((field) => field.trim());
    const amount = Number(amountText);
    if (amountText === '' || !Number.isFinite(amount)) continue;
    items.push({ date, description, amount, category });
  }
  return items;
}

function escapeField(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Serializes transactions to CSV with the header row first.
export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const { date, description, amount, category } of items) {
    lines.push([date, description, amount, category].map(escapeField).join(','));
  }
  return lines.join('\n') + '\n';
}
