const HEADER = ['date', 'description', 'amount', 'category'];

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1;
  for (; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"' && field === '') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  const rows = parseRows(String(text ?? ''));
  if (rows.length === 0) return [];
  const names = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {};
  HEADER.forEach((name, n) => {
    const found = names.indexOf(name);
    idx[name] = found >= 0 ? found : n;
  });
  return rows.slice(1).map((r) => ({
    date: (r[idx.date] ?? '').trim(),
    description: r[idx.description] ?? '',
    amount: Number((r[idx.amount] ?? '').trim()),
    category: r[idx.category] ?? '',
  }));
}

function quote(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const it of items) {
    lines.push([it.date, it.description, it.amount, it.category].map(quote).join(','));
  }
  return lines.join('\n');
}
