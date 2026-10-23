const HEADERS = ['date', 'description', 'amount', 'category'];

export function parseCSV(text) {
  const source = String(text ?? '').replace(/^\uFEFF/, '');
  const records = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field.length === 0) quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      row.push(field); field = '';
      if (row.some(value => value !== '')) records.push(row);
      row = [];
      if (ch === '\r' && source[i + 1] === '\n') i++;
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some(value => value !== '')) records.push(row); }
  if (!records.length) return [];
  const header = records.shift().map(value => value.trim().toLowerCase());
  const index = Object.fromEntries(HEADERS.map(key => [key, header.indexOf(key)]));
  return records.map(values => ({
    date: values[index.date] ?? '',
    description: values[index.description] ?? '',
    amount: Number(values[index.amount] ?? 0),
    category: values[index.category] ?? ''
  })).filter(item => Number.isFinite(item.amount));
}

export function toCSV(items) {
  const escape = value => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [HEADERS.join(','), ...items.map(item => HEADERS.map(key => escape(item[key])).join(','))].join('\r\n');
}
