const FIELDS = ['date', 'description', 'amount', 'category'];

// Split CSV text into rows of fields, honoring double-quoted fields
// (which may contain commas, newlines and "" escaped quotes).
function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
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
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  let source = String(text ?? '');
  if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);
  const rows = parseRows(source);
  if (rows.length === 0) return [];

  const header = rows[0].map(h => h.trim().toLowerCase());
  const hasHeader = FIELDS.every(f => header.includes(f));
  const index = hasHeader
    ? Object.fromEntries(FIELDS.map(f => [f, header.indexOf(f)]))
    : Object.fromEntries(FIELDS.map((f, i) => [f, i]));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map(r => {
    const get = f => (r[index[f]] ?? '').trim();
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
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(items) {
  const lines = [FIELDS.join(',')];
  for (const item of items) {
    lines.push(FIELDS.map(f => quote(item[f])).join(','));
  }
  return lines.join('\n') + '\n';
}
