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
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        if (i + 1 < len && text[i + 1] === '\n') {
          i += 2;
        } else {
          i++;
        }
      } else if (ch === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
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

  const header = rows[0].map((h) => h.trim());
  const dateIdx = header.indexOf('date');
  const descIdx = header.indexOf('description');
  const amountIdx = header.indexOf('amount');
  const catIdx = header.indexOf('category');

  const startIdx = dateIdx !== -1 ? 1 : 0;
  const result = [];

  for (let r = startIdx; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0] === '') {
      continue;
    }
    const date = row[dateIdx !== -1 ? dateIdx : 0] ?? '';
    const description = row[descIdx !== -1 ? descIdx : 1] ?? '';
    const amountRaw = row[amountIdx !== -1 ? amountIdx : 2] ?? '0';
    const category = row[catIdx !== -1 ? catIdx : 3] ?? '';

    result.push({
      date,
      description,
      amount: Number(amountRaw),
      category,
    });
  }

  return result;
}

function escapeCSVField(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function toCSV(items) {
  const lines = ['date,description,amount,category'];
  for (const item of items) {
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
