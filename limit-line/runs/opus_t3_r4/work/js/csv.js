// CSV parsing and serialization for transactions.
// Format: header row "date,description,amount,category"; fields may be
// wrapped in double quotes, and a quote inside a quoted field is written "".

export const HEADERS = ['date', 'description', 'amount', 'category'];

// Split CSV text into rows of raw string fields (RFC 4180 style).
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
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      field += ch;
    }
    i++;
  }

  // Last row if the text does not end with a newline.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop blank lines.
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function toNumber(value) {
  const cleaned = String(value ?? '').trim().replace(/\s+/g, '');
  if (cleaned === '') return NaN;
  return Number(cleaned);
}

export function parseCSV(text) {
  if (typeof text !== 'string') return [];
  // Strip a UTF-8 byte order mark if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = parseRows(text);
  if (rows.length === 0) return [];

  // Map columns by header name; fall back to the standard order.
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader = HEADERS.every((name) => header.includes(name));
  const index = {};
  HEADERS.forEach((name, pos) => {
    index[name] = hasHeader ? header.indexOf(name) : pos;
  });
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((r) => ({
    date: (r[index.date] ?? '').trim(),
    description: (r[index.description] ?? '').trim(),
    amount: toNumber(r[index.amount]),
    category: (r[index.category] ?? '').trim(),
  }));
}

function escapeField(value) {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\r\n]/.test(s) || s !== s.trim()) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCSV(items) {
  const lines = [HEADERS.join(',')];
  for (const item of items || []) {
    lines.push(HEADERS.map((name) => escapeField(item[name])).join(','));
  }
  return lines.join('\n') + '\n';
}
