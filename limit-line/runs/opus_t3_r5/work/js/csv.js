const FIELDS = ['date', 'description', 'amount', 'category'];

// Split CSV text into rows of fields. Handles quoted fields containing
// commas, newlines and escaped quotes ("").
function tokenize(text) {
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
  // Drop blank lines.
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  const rows = tokenize(String(text ?? ''));
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader = FIELDS.every((f) => header.includes(f));
  const index = hasHeader
    ? Object.fromEntries(FIELDS.map((f) => [f, header.indexOf(f)]))
    : { date: 0, description: 1, amount: 2, category: 3 };
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((r) => {
    const get = (f) => (r[index[f]] ?? '').trim();
    const amount = Number(get('amount').replace(/\s/g, ''));
    return {
      date: get('date'),
      description: get('description'),
      amount: Number.isFinite(amount) ? amount : 0,
      category: get('category'),
    };
  });
}

function quote(value) {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(items) {
  const lines = [FIELDS.join(',')];
  for (const item of items || []) {
    lines.push(FIELDS.map((f) => quote(item[f])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
