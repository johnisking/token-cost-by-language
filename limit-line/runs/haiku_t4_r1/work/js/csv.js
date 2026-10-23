const FIELDS = ['date', 'description', 'amount', 'category'];

// Parses CSV text into {date, description, amount, category} objects.
// The first row is the header; columns are matched by name when present,
// otherwise by position.
export function parseCSV(text) {
  const rows = parseRows(text);
  if (rows.length === 0) return [];

  const header = rows[0].map(name => name.trim());
  const columns = FIELDS.map((name, i) => {
    const found = header.indexOf(name);
    return found === -1 ? i : found;
  });

  return rows.slice(1).map(row => {
    const [date, description, amount, category] = columns.map(c => row[c] ?? '');
    return {
      date: date.trim(),
      description,
      amount: Number(amount.trim()),
      category,
    };
  });
}

// Serializes items as CSV with a header row. Fields that contain commas,
// quotes or line breaks are quoted, with inner quotes doubled.
export function toCSV(items) {
  const lines = [FIELDS.join(',')];
  for (const item of items) {
    lines.push(FIELDS.map(field => escapeField(item[field])).join(','));
  }
  return lines.join('\n') + '\n';
}

function escapeField(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Splits CSV text into rows of fields, handling quoted fields and both
// \n and \r\n line endings. Blank lines are dropped.
function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += c;
        i += 1;
      }
      continue;
    }

    if (c === '"' && field === '') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r' || c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      if (c === '\r' && text[i + 1] === '\n') i += 1;
    } else {
      field += c;
    }
    i += 1;
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}
