const HEADERS = ['date', 'description', 'amount', 'category'];

export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const input = String(text ?? '').replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const header = rows.shift().map(value => value.trim().toLowerCase());
  const indexes = HEADERS.map(name => header.indexOf(name));
  if (indexes.some(index => index < 0)) throw new Error('CSV header must contain date,description,amount,category');
  return rows.filter(values => values.some(value => value !== '')).map(values => {
    const amount = Number(values[indexes[2]]);
    if (!Number.isFinite(amount)) throw new Error('CSV contains an invalid amount');
    return { date: values[indexes[0]] ?? '', description: values[indexes[1]] ?? '', amount, category: values[indexes[3]] ?? '' };
  });
}

export function toCSV(items) {
  const quote = value => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [HEADERS.join(','), ...items.map(item => HEADERS.map(key => quote(item[key])).join(','))].join('\r\n');
}
