const HEADER = 'date,description,amount,category';

// Splits CSV text into rows of raw fields. Handles quoted fields, commas and
// newlines inside quotes, and doubled quotes ("") as an escaped quote.
function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
    } else if (ch === ',') {
      row.push(field);
      field = '';
      i++;
    } else if (ch === '\r' || ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
    } else {
      field += ch;
      i++;
    }
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted field in CSV');
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Parses CSV text with the header date,description,amount,category into
// transaction objects. The header row is optional; blank lines are skipped.
export function parseCSV(text) {
  const rows = parseRows(text.replace(/^﻿/, ''));
  const items = [];

  rows.forEach((fields, index) => {
    if (fields.length === 1 && fields[0].trim() === '') return;

    const lineNo = index + 1;
    if (index === 0 && fields[0].trim().toLowerCase() === 'date') return;

    if (fields.length !== 4) {
      throw new Error(`Line ${lineNo}: expected 4 fields, got ${fields.length}`);
    }

    const [date, description, rawAmount, category] = fields.map((f) => f.trim());
    const amount = Number(rawAmount);
    if (rawAmount === '' || !Number.isFinite(amount)) {
      throw new Error(`Line ${lineNo}: invalid amount "${rawAmount}"`);
    }

    items.push({ date, description, amount, category });
  });

  return items;
}

function escapeField(value) {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Serializes transactions to CSV text with a header row.
export function toCSV(items) {
  const lines = items.map((item) =>
    [item.date, item.description, Number(item.amount).toFixed(2), item.category]
      .map(escapeField)
      .join(',')
  );
  return [HEADER, ...lines].join('\n') + '\n';
}
