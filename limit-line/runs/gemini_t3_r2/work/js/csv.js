export function parseCSV(text) {
  if (!text || !text.trim()) {
    return [];
  }

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  const nonEmptyRows = rows.filter(
    (r) => !(r.length === 1 && r[0].trim() === '')
  );

  if (nonEmptyRows.length <= 1) {
    return [];
  }

  const headers = nonEmptyRows[0].map((h) => h.trim().toLowerCase());
  const dateIdx = headers.indexOf('date');
  const descIdx = headers.indexOf('description');
  const amountIdx = headers.indexOf('amount');
  const catIdx = headers.indexOf('category');

  return nonEmptyRows.slice(1).map((row) => ({
    date: row[dateIdx !== -1 ? dateIdx : 0] ?? '',
    description: row[descIdx !== -1 ? descIdx : 1] ?? '',
    amount: Number(row[amountIdx !== -1 ? amountIdx : 2] ?? 0),
    category: row[catIdx !== -1 ? catIdx : 3] ?? '',
  }));
}

function escapeCSVField(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV(items) {
  const header = 'date,description,amount,category';
  if (!items || items.length === 0) {
    return header;
  }
  const lines = items.map((item) =>
    [
      escapeCSVField(item.date),
      escapeCSVField(item.description),
      escapeCSVField(item.amount),
      escapeCSVField(item.category),
    ].join(',')
  );
  return [header, ...lines].join('\n');
}
