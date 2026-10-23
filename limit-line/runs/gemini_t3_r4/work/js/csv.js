/**
 * Parses a single CSV line handling double-quoted fields and escaped quotes.
 * @param {string} line
 * @returns {string[]}
 */
function parseCSVLine(line) {
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

/**
 * Quotes a CSV field if it contains commas, quotes, or newlines.
 * @param {string|number} value
 * @returns {string}
 */
function formatCSVField(value) {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parses CSV text with header row date,description,amount,category.
 * @param {string} text
 * @returns {Array<{date: string, description: string, amount: number, category: string}>}
 */
export function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  // Check if first row is header
  const firstFields = parseCSVLine(lines[0]).map((f) => f.trim().toLowerCase());
  const startIndex =
    firstFields[0] === 'date' &&
    firstFields[1] === 'description' &&
    firstFields[2] === 'amount' &&
    firstFields[3] === 'category'
      ? 1
      : 0;

  const items = [];
  for (let i = startIndex; i < lines.length; i++) {
    const [date = '', description = '', amountStr = '0', category = ''] = parseCSVLine(lines[i]);
    const amount = Number(amountStr.trim());
    items.push({
      date: date.trim(),
      description: description,
      amount: Number.isNaN(amount) ? 0 : amount,
      category: category.trim(),
    });
  }
  return items;
}

/**
 * Serializes an array of transaction objects into CSV text.
 * @param {Array<{date: string, description: string, amount: number, category: string}>} items
 * @returns {string}
 */
export function toCSV(items) {
  const header = 'date,description,amount,category';
  if (!Array.isArray(items) || items.length === 0) {
    return header;
  }
  const rows = items.map((item) =>
    [
      formatCSVField(item.date),
      formatCSVField(item.description),
      formatCSVField(item.amount),
      formatCSVField(item.category),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}
