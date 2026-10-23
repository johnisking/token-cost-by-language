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
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

export function parseCSV(text) {
  const rows = parseRows(String(text));
  if (rows.length === 0) return [];
  const first = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader = first.includes('date') && first.includes('amount');
  const index = {};
  HEADER.forEach((name, n) => {
    const at = first.indexOf(name);
    index[name] = hasHeader && at >= 0 ? at : n;
  });
  const items = [];
  for (const r of hasHeader ? rows.slice(1) : rows) {
    const amount = parseFloat(r[index.amount]);
    if (Number.isNaN(amount)) continue;
    items.push({
      date: (r[index.date] ?? '').trim(),
      description: r[index.description] ?? '',
      amount,
      category: (r[index.category] ?? '').trim(),
    });
  }
  return items;
}

function quote(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const it of items) {
    lines.push(HEADER.map((k) => quote(it[k])).join(','));
  }
  return lines.join('\n') + '\n';
}
