const HEADER = ['date', 'description', 'amount', 'category'];

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1;
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
    } else if (c === '\r' || c === '\n') {
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
  return rows;
}

export function parseCSV(text) {
  const rows = parseRows(String(text ?? ''));
  if (rows.length === 0) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  const known = HEADER.every(h => header.includes(h));
  const idx = known
    ? Object.fromEntries(HEADER.map(h => [h, header.indexOf(h)]))
    : { date: 0, description: 1, amount: 2, category: 3 };
  const body = known ? rows.slice(1) : rows;
  const items = [];
  for (const r of body) {
    if (r.length === 1 && r[0].trim() === '') continue;
    items.push({
      date: (r[idx.date] ?? '').trim(),
      description: r[idx.description] ?? '',
      amount: Number(String(r[idx.amount] ?? '').trim()) || 0,
      category: r[idx.category] ?? '',
    });
  }
  return items;
}

function quote(value) {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const it of items || []) {
    lines.push(HEADER.map(h => quote(it[h])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
