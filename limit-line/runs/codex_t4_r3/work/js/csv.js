const HEADER = ['date', 'description', 'amount', 'category'];

export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  text = String(text ?? '').replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field.length === 0) quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      row.push(field); field = '';
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else field += ch;
  }
  row.push(field);
  if (row.some(value => value !== '')) rows.push(row);
  if (!rows.length) return [];
  const first = rows.shift().map(value => value.trim().toLowerCase());
  const hasHeader = HEADER.every((name, i) => first[i] === name);
  const data = hasHeader ? rows : [first, ...rows];
  return data.filter(values => values.some(value => value !== '')).map(values => ({
    date: values[0] ?? '', description: values[1] ?? '',
    amount: Number(values[2] ?? 0), category: values[3] ?? ''
  }));
}

export function toCSV(items) {
  const quote = value => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [HEADER.join(','), ...items.map(item => HEADER.map(key => quote(item[key])).join(','))].join('\r\n');
}
