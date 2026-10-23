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
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  const rows = parseRows(String(text));
  if (!rows.length) return [];
  const first = rows[0].map(s => s.trim().toLowerCase());
  let idx = [0, 1, 2, 3];
  let start = 0;
  if (first.includes('date') && first.includes('amount')) {
    start = 1;
    idx = HEADER.map((h, k) => (first.includes(h) ? first.indexOf(h) : k));
  }
  return rows.slice(start).map(r => ({
    date: (r[idx[0]] ?? '').trim(),
    description: r[idx[1]] ?? '',
    amount: parseFloat(r[idx[2]]),
    category: r[idx[3]] ?? '',
  }));
}

function quote(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const it of items) {
    lines.push([it.date, it.description, it.amount, it.category].map(quote).join(','));
  }
  return lines.join('\n');
}
