const FIELDS = ['date', 'description', 'amount', 'category'];

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  let s = String(text ?? '');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' || c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
      i += (c === '\r' && s[i + 1] === '\n') ? 2 : 1;
      continue;
    }
    field += c; i++;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  const rows = parseRows(text);
  if (rows.length === 0) return [];
  let header = rows[0].map(h => h.trim().toLowerCase());
  let body = rows.slice(1);
  if (!FIELDS.every(f => header.includes(f))) {
    header = FIELDS;
    body = rows;
  }
  const idx = Object.fromEntries(FIELDS.map(f => [f, header.indexOf(f)]));
  return body.map(r => {
    const amount = Number(String(r[idx.amount] ?? '').trim());
    return {
      date: (r[idx.date] ?? '').trim(),
      description: r[idx.description] ?? '',
      amount: Number.isFinite(amount) ? amount : 0,
      category: r[idx.category] ?? '',
    };
  });
}

function quote(value) {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = [FIELDS.join(',')];
  for (const item of items || []) {
    lines.push(FIELDS.map(f => quote(item[f])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
