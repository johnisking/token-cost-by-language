export const HEADERS = ['date', 'description', 'amount', 'category'];

// Split CSV text into rows of raw string fields. Handles quoted fields
// containing commas, newlines, and escaped quotes ("").
function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1; // strip BOM

  for (; i < text.length; i++) {
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
  // Drop blank lines
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  const rows = parseRows(String(text ?? ''));
  if (rows.length === 0) return [];

  let header = rows[0].map((h) => h.trim().toLowerCase());
  let dataRows = rows.slice(1);
  if (!HEADERS.every((h) => header.includes(h))) {
    // No recognizable header: assume the default column order.
    header = HEADERS;
    dataRows = rows;
  }
  const idx = Object.fromEntries(HEADERS.map((h) => [h, header.indexOf(h)]));

  return dataRows.map((r) => {
    const get = (key) => (idx[key] >= 0 && r[idx[key]] !== undefined ? r[idx[key]] : '');
    const amount = parseFloat(String(get('amount')).trim().replace(/[^0-9eE+\-.]/g, ''));
    return {
      date: get('date').trim(),
      description: get('description'),
      amount: Number.isFinite(amount) ? amount : 0,
      category: get('category').trim(),
    };
  });
}

function escapeField(value) {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(items) {
  const lines = [HEADERS.join(',')];
  for (const item of items || []) {
    lines.push(HEADERS.map((h) => escapeField(item[h])).join(','));
  }
  return lines.join('\n') + '\n';
}
