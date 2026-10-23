const HEADER = ['date', 'description', 'amount', 'category'];

// Parses CSV text into transaction objects. Quoted fields may contain commas,
// doubled quotes and line breaks; both \n and \r\n line endings are accepted.
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Skip blank lines.
  const records = rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
  if (records.length === 0) return [];

  const header = records[0].map((h) => h.trim());
  const column = (name) => {
    const index = header.indexOf(name);
    return index >= 0 ? index : HEADER.indexOf(name);
  };
  const dateCol = column('date');
  const descriptionCol = column('description');
  const amountCol = column('amount');
  const categoryCol = column('category');

  return records.slice(1).map((r) => ({
    date: (r[dateCol] ?? '').trim(),
    description: r[descriptionCol] ?? '',
    amount: Number((r[amountCol] ?? '').trim()),
    category: (r[categoryCol] ?? '').trim(),
  }));
}

function escapeField(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// Serializes transactions to CSV with the header date,description,amount,category.
export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const item of items) {
    lines.push(HEADER.map((key) => escapeField(item[key])).join(','));
  }
  return lines.join('\n');
}
