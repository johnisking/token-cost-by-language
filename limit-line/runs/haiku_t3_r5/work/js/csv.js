const HEADER = ['date', 'description', 'amount', 'category'];

// Splits CSV text into rows of string fields. Handles quoted fields,
// escaped quotes ("") and newlines inside quotes.
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

function isBlankRow(row) {
  return row.every((cell) => cell.trim() === '');
}

// Parses CSV text with a date,description,amount,category header into
// transaction objects. Rows without a valid amount are skipped.
export function parseCSV(text) {
  // Strip a leading byte-order mark, if present.
  const rows = splitRows(text.replace(/^﻿/, '')).filter((row) => !isBlankRow(row));
  if (rows.length === 0) return [];

  let columns = HEADER;
  const firstRow = rows[0].map((cell) => cell.trim().toLowerCase());
  if (firstRow[0] === 'date') {
    columns = firstRow;
    rows.shift();
  }

  const column = (row, name) => (row[columns.indexOf(name)] ?? '').trim();

  return rows
    .filter((row) => column(row, 'amount') !== '')
    .map((row) => ({
      date: column(row, 'date'),
      description: column(row, 'description'),
      amount: Number(column(row, 'amount').replace(/,/g, '')),
      category: column(row, 'category'),
    }))
    .filter((item) => Number.isFinite(item.amount));
}

function escapeField(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Serializes transactions to CSV with a header row.
export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const item of items) {
    lines.push(HEADER.map((key) => escapeField(item[key])).join(','));
  }
  return lines.join('\n') + '\n';
}
