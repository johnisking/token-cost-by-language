const HEADERS = ['date', 'description', 'amount', 'category'];

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value !== '')) rows.push(row);
  if (!rows.length) return [];

  const first = rows[0].map((value) => value.trim().replace(/^\uFEFF/, '').toLowerCase());
  const hasHeader = HEADERS.every((header, index) => first[index] === header);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return dataRows.map((values) => {
    const columns = values;
    const amount = Number(columns[2] ?? '');
    return {
      date: String(columns[0] ?? '').trim(),
      description: String(columns[1] ?? '').trim(),
      amount: Number.isFinite(amount) ? amount : 0,
      category: String(columns[3] ?? '').trim(),
    };
  }).filter((item) => item.date || item.description || item.category || item.amount !== 0);
}

function escapeField(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCSV(items) {
  const lines = [HEADERS.join(',')];
  for (const item of items) {
    lines.push([item.date, item.description, item.amount, item.category].map(escapeField).join(','));
  }
  return lines.join('\r\n');
}
