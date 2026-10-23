// CSV helpers for the expense tracker. No dependencies.

const HEADER = ['date', 'description', 'amount', 'category'];

// Splits CSV text into rows of raw string fields. Quoted fields may contain
// commas, doubled quotes ("") and line breaks.
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
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Parses CSV text with the header date,description,amount,category.
// The first row is treated as the header. Rows whose amount is not a number
// are skipped.
export function parseCSV(text) {
  // Drop a leading byte-order mark, which some spreadsheet exports add.
  const [, ...body] = splitRows(text.replace(/^﻿/, ''));

  return body
    .filter(fields => fields.some(f => f.trim() !== ''))
    .map(([date = '', description = '', amount = '', category = '']) => {
      const value = amount.trim();
      return {
        date: date.trim(),
        description: description.trim(),
        amount: value === '' ? NaN : Number(value),
        category: category.trim(),
      };
    })
    .filter(item => Number.isFinite(item.amount));
}

function escapeField(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Serializes transactions to CSV text with the same header parseCSV expects.
export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const item of items) {
    lines.push(HEADER.map(key => escapeField(item[key])).join(','));
  }
  return lines.join('\n') + '\n';
}
