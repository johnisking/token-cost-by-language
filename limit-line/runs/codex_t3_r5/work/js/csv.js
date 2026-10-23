const HEADER = ['date', 'description', 'amount', 'category'];
function rowsFrom(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r' || c === '\n') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
export function parseCSV(text) {
  const rows = rowsFrom(String(text).replace(/^\uFEFF/, ''));
  if (!rows.length) return [];
  const headers = rows.shift().map(s => s.trim().toLowerCase());
  const indexes = HEADER.map(h => headers.indexOf(h));
  if (indexes.some(i => i < 0)) throw new Error('CSV must have date,description,amount,category headers.');
  return rows.filter(row => row.some(s => s.trim())).map(row => {
    const amount = Number((row[indexes[2]] || '').trim());
    if (!Number.isFinite(amount)) throw new Error('CSV contains an invalid amount.');
    return { date: (row[indexes[0]] || '').trim(), description: row[indexes[1]] || '', amount, category: (row[indexes[3]] || '').trim() };
  });
}
function quote(value) { const s = String(value ?? ''); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
export function toCSV(items) { return [HEADER.join(','), ...items.map(item => HEADER.map(key => quote(item[key])).join(','))].join('\r\n'); }
