const FIELDS = ['date', 'description', 'amount', 'category'];

// Split CSV text into rows of raw string fields (RFC 4180 style quoting).
function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1; // strip BOM

  for (; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop blank lines.
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function parseAmount(value) {
  const n = parseFloat(String(value).trim().replace(/\s/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function parseCSV(text) {
  const rows = parseRows(String(text ?? ''));
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader = FIELDS.every((f) => header.includes(f));
  const index = hasHeader
    ? Object.fromEntries(FIELDS.map((f) => [f, header.indexOf(f)]))
    : Object.fromEntries(FIELDS.map((f, i) => [f, i]));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((r) => ({
    date: (r[index.date] ?? '').trim(),
    description: r[index.description] ?? '',
    amount: parseAmount(r[index.amount] ?? ''),
    category: (r[index.category] ?? '').trim(),
  }));
}

function escapeField(value) {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(items) {
  const lines = [FIELDS.join(',')];
  for (const item of items || []) {
    lines.push(FIELDS.map((f) => escapeField(item[f])).join(','));
  }
  return lines.join('\n') + '\n';
}
