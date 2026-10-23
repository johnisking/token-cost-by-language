const HEADERS = ['date', 'description', 'amount', 'category'];

export function parseCSV(text) {
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
  if (!rows.length) return [];
  const header = rows.shift().map((value, index) => (index === 0 ? value.replace(/^\uFEFF/, '') : value).trim().toLowerCase());
  const positions = HEADERS.map(name => header.indexOf(name));
  if (positions.some(index => index < 0)) throw new Error('CSV must have date,description,amount,category columns.');
  return rows.filter(values => values.some(value => value.trim() !== '')).map(values => {
    const amount = Number(values[positions[2]]);
    if (!Number.isFinite(amount)) throw new Error('CSV contains an invalid amount.');
    return { date: values[positions[0]] ?? '', description: values[positions[1]] ?? '', amount, category: values[positions[3]] ?? '' };
  });
}

export function toCSV(items) {
  const escape = value => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [HEADERS.join(','), ...items.map(item => HEADERS.map(key => escape(item[key])).join(','))].join('\r\n');
}
