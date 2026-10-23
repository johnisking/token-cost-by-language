const HEADER = ['date', 'description', 'amount', 'category'];

// Read one CSV record at a time, honoring quoted commas, escaped quotes, and newlines.
function readRows(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function parseCSV(text) {
  const rows = readRows(String(text).replace(/^\uFEFF/, ''));
  if (!rows.length) return [];
  const first = rows[0].map(value => value.trim().toLowerCase());
  const hasHeader = HEADER.every((name, index) => first[index] === name);
  const data = hasHeader ? rows.slice(1) : rows;
  return data.filter(row => row.some(value => value.trim() !== '')).map(row => ({
    date: row[0] ?? '', description: row[1] ?? '', amount: Number(row[2] ?? 0), category: row[3] ?? ''
  })).filter(item => Number.isFinite(item.amount));
}

function escapeField(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCSV(items) {
  return [HEADER.join(','), ...items.map(item => HEADER.map(key => escapeField(item[key])).join(','))].join('\r\n');
}
