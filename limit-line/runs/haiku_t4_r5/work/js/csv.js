// CSV helpers for transactions. Header row: date,description,amount,category

const HEADER = ['date', 'description', 'amount', 'category'];
const BOM = 0xfeff;

// Splits CSV text into rows of raw string fields, honouring quotes,
// doubled quotes and line breaks inside quoted fields.
function splitRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
    i++;
  }

  // Last record without a trailing line break.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Ignore completely blank lines.
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

export function parseCSV(text) {
  let source = String(text);
  // Skip a leading byte-order mark (common in files saved by spreadsheet apps).
  if (source.charCodeAt(0) === BOM) source = source.slice(1);

  const rows = splitRows(source);
  if (rows.length === 0) return [];

  const header = rows[0].map(name => name.trim());
  const col = name => header.indexOf(name);

  return rows.slice(1).map(cells => {
    const get = name => {
      const index = col(name);
      return index >= 0 && index < cells.length ? cells[index] : '';
    };
    return {
      date: get('date').trim(),
      description: get('description'),
      amount: Number(get('amount').trim()),
      category: get('category').trim(),
    };
  });
}

function escapeField(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const item of items) {
    lines.push(HEADER.map(key => escapeField(item[key])).join(','));
  }
  return lines.join('\n') + '\n';
}
