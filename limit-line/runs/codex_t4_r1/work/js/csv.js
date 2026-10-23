const HEADERS = ['date', 'description', 'amount', 'category'];

export function parseCSV(text) {
  const input = String(text ?? '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      row.push(field); field = '';
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      if (ch === '\r' && input[i + 1] === '\n') i++;
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some(value => value !== '')) rows.push(row); }
  if (!rows.length) return [];
  const header = rows.shift().map(value => value.trim().toLowerCase());
  const indexes = HEADERS.map(name => header.indexOf(name));
  if (indexes.some(index => index < 0)) throw new Error('CSV must have date, description, amount, category columns.');
  return rows.filter(values => values.some(value => value !== '')).map(values => {
    const amount = Number(values[indexes[2]]);
    if (!Number.isFinite(amount)) throw new Error('CSV contains an invalid amount.');
    return { date: values[indexes[0]], description: values[indexes[1]], amount, category: values[indexes[3]] };
  });
}

export function toCSV(items) {
  const escape = value => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [HEADERS.join(','), ...items.map(item => HEADERS.map(key => escape(key === 'amount' ? Number(item[key]) : item[key])).join(','))].join('\r\n');
}
