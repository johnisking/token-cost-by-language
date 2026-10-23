const HEADER = 'date,description,amount,category';

export function parseCSV(text) {
  if (!text || !text.trim()) {
    return [];
  }

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        currentField += ch;
        i++;
      }
    } else {
      if (ch === '"' && currentField === '') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (ch === '\r') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        if (i + 1 < len && text[i + 1] === '\n') {
          i += 2;
        } else {
          i++;
        }
      } else if (ch === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
      } else {
        currentField += ch;
        i++;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return [];
  }

  // Check if first row is header
  let startIndex = 0;
  const firstRow = rows[0].map((c) => c.trim().toLowerCase());
  if (
    firstRow.length >= 4 &&
    firstRow[0] === 'date' &&
    firstRow[1] === 'description' &&
    firstRow[2] === 'amount' &&
    firstRow[3] === 'category'
  ) {
    startIndex = 1;
  }

  const items = [];
  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0] === '') {
      continue;
    }
    const [date = '', description = '', amountStr = '0', category = ''] = row;
    items.push({
      date,
      description,
      amount: Number(amountStr),
      category,
    });
  }

  return items;
}

function escapeCSVField(value) {
  const str = value == null ? '' : String(value);
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function toCSV(items) {
  const lines = [HEADER];
  for (const item of items || []) {
    const row = [
      escapeCSVField(item.date),
      escapeCSVField(item.description),
      escapeCSVField(item.amount),
      escapeCSVField(item.category),
    ];
    lines.push(row.join(','));
  }
  return lines.join('\n');
}
