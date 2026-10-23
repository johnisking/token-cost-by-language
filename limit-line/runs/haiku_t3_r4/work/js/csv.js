// Split CSV text into rows of fields. Handles quoted fields, escaped quotes ("")
// and both LF and CRLF line endings.
function parseRecords(text) {
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

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Parse CSV text with the header date,description,amount,category into
// an array of {date, description, amount, category}, amount as a number.
export function parseCSV(text) {
  // Strip a leading byte-order mark, which some spreadsheet exports add.
  const rows = parseRecords(text.replace(/^﻿/, ''))
    .filter(row => !(row.length === 1 && row[0].trim() === ''));

  if (rows.length > 0 && rows[0][0].trim().toLowerCase() === 'date') {
    rows.shift();
  }

  return rows.map((row, index) => {
    const [date = '', description = '', amountText = '', category = ''] =
      row.map(value => value.trim());
    const amount = Number(amountText);
    if (amountText === '' || !Number.isFinite(amount)) {
      throw new Error(`Invalid amount "${amountText}" in CSV row ${index + 1}`);
    }
    return { date, description, amount, category };
  });
}

// Quote a field when it contains a comma, quote, line break, or edge spaces.
function escapeField(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text) || text !== text.trim()) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// Convert transactions to CSV text, starting with the header row.
export function toCSV(items) {
  const lines = ['date,description,amount,category'];
  for (const item of items) {
    lines.push(
      [item.date, item.description, item.amount, item.category]
        .map(escapeField)
        .join(',')
    );
  }
  return lines.join('\n');
}
