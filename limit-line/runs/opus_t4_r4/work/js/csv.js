const HEADER = ['date', 'description', 'amount', 'category'];

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  let s = String(text ?? '');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1); // strip BOM
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
      if (c === '\r' && s[i + 1] === '\n') i++;
      i++; continue;
    }
    field += c; i++;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  // drop blank lines
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  const rows = parseRows(text);
  if (rows.length === 0) return [];
  let start = 0;
  let idx = { date: 0, description: 1, amount: 2, category: 3 };
  const first = rows[0].map(h => h.trim().toLowerCase());
  if (first.includes('date') && first.includes('amount')) {
    start = 1;
    idx = {};
    HEADER.forEach((h, n) => { const p = first.indexOf(h); idx[h] = p === -1 ? n : p; });
  }
  return rows.slice(start).map(r => ({
    date: (r[idx.date] ?? '').trim(),
    description: r[idx.description] ?? '',
    amount: Number(String(r[idx.amount] ?? '').trim()) || 0,
    category: r[idx.category] ?? '',
  }));
}

function quote(value) {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const it of items || []) {
    lines.push([it.date, it.description, it.amount, it.category].map(quote).join(','));
  }
  return lines.join('\n') + '\n';
}
