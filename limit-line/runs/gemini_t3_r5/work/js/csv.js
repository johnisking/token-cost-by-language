export function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\r') {
        if (i + 1 < len && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (ch === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
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

  if (nonEmptyRows.length === 0) return [];

  let startIndex = 0;
  const firstRow = nonEmptyRows[0].map((c) => c.trim().toLowerCase());
  if (
    firstRow[0] === 'date' &&
    firstRow[1] === 'description' &&
    firstRow[2] === 'amount' &&
    firstRow[3] === 'category'
  ) {
    startIndex = 1;
  }

  const result = [];
  for (let i = startIndex; i < nonEmptyRows.length; i++) {
    const row = nonEmptyRows[i];
    if (row.length < 4) continue;
    const [date, description, amountStr, category] = row;
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
  const header = 'date,description,amount,category';
  if (!Array.isArray(items) || items.length === 0) {
    return header;
  }
  const lines = [header];
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
