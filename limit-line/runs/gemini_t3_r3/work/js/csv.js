export function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

export function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const firstFields = parseCSVLine(lines[0]).map((s) => s.trim().toLowerCase());
  const hasHeader =
    firstFields[0] === 'date' &&
    firstFields[1] === 'description' &&
    firstFields[2] === 'amount' &&
    firstFields[3] === 'category';

  const startIndex = hasHeader ? 1 : 0;
  const items = [];

  for (let i = startIndex; i < lines.length; i++) {
    const [date = '', description = '', amountStr = '0', category = ''] = parseCSVLine(lines[i]);
    const amount = Number(amountStr.trim());
    items.push({
      date: date.trim(),
      description: description.trim(),
      amount: Number.isNaN(amount) ? 0 : amount,
      category: category.trim(),
    });
  }

  return items;
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
  if (!Array.isArray(items) || items.length === 0) {
    return header;
  }
  const rows = items.map((item) =>
    [
      escapeCSVField(item.date),
      escapeCSVField(item.description),
      escapeCSVField(item.amount),
      escapeCSVField(item.category),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}
