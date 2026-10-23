const COLUMNS = ['date', 'description', 'amount', 'category'];

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1;
  const endField = () => { row.push(field); field = ''; };
  const endRow = () => { endField(); rows.push(row); row = []; };
  for (; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      endField();
    } else if (c === '\r') {
      if (text[i + 1] === '\n') i++;
      endRow();
    } else if (c === '\n') {
      endRow();
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) endRow();
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  const rows = parseRows(String(text ?? ''));
  if (rows.length === 0) return [];
  let order = COLUMNS;
  const first = rows[0].map(h => h.trim().toLowerCase());
  if (first.includes('date') && first.includes('amount')) {
    order = first;
    rows.shift();
  }
  const idx = name => order.indexOf(name);
  return rows.map(r => {
    const get = name => {
      const k = idx(name);
      return k >= 0 && k < r.length ? r[k] : '';
    };
    return {
      date: get('date').trim(),
      description: get('description'),
      amount: Number(get('amount').trim()),
      category: get('category'),
    };
  });
}

function quote(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = [COLUMNS.join(',')];
  for (const it of items) {
    lines.push(COLUMNS.map(c => quote(it[c])).join(','));
  }
  return lines.join('\n');
}
