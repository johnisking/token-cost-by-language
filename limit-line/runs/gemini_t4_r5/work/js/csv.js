export function parseCSV(text) {
  if (!text || !text.trim()) return [];

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"' && field === '') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\r') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        if (i + 1 < len && text[i + 1] === '\n') {
          i += 2;
        } else {
          i++;
        }
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length <= 1) return [];

  const result = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (cols.length === 1 && cols[0] === '') continue;
    const [date = '', description = '', amountStr = '0', category = ''] = cols;
    result.push({
      date,
      description,
      amount: Number(amountStr),
      category,
    });
  }

  return result;
}

function escapeCSVField(value) {
  const str = value == null ? '' : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function toCSV(items) {
  const lines = ['date,description,amount,category'];
  for (const item of items) {
    lines.push(
      [
        escapeCSVField(item.date),
        escapeCSVField(item.description),
        escapeCSVField(item.amount),
        escapeCSVField(item.category),
      ].join(',')
    );
  }
  return lines.join('\n');
}
