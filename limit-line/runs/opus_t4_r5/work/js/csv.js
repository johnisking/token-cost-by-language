// CSV parsing and serialisation for transactions.
// Format: header row "date,description,amount,category"; fields may be quoted.

const HEADER = ['date', 'description', 'amount', 'category'];

// Split CSV text into an array of records (arrays of raw string fields).
function parseRecords(text) {
  const records = [];
  let record = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const s = String(text ?? '').replace(/^﻿/, '');

  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ',') {
      record.push(field);
      field = '';
      i++;
    } else if (c === '\r' || c === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      i += c === '\r' && s[i + 1] === '\n' ? 2 : 1;
    } else {
      field += c;
      i++;
    }
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  // Drop blank lines.
  return records.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  const records = parseRecords(text);
  if (records.length === 0) return [];

  let columns = HEADER;
  let start = 0;
  const first = records[0].map((h) => h.trim().toLowerCase());
  if (HEADER.every((h) => first.includes(h))) {
    columns = first;
    start = 1;
  }
  const idx = Object.fromEntries(HEADER.map((h) => [h, columns.indexOf(h)]));

  const items = [];
  for (let r = start; r < records.length; r++) {
    const rec = records[r];
    const get = (name) => (idx[name] >= 0 && idx[name] < rec.length ? rec[idx[name]] : '');
    const amountText = get('amount').trim();
    items.push({
      date: get('date').trim(),
      description: get('description'),
      amount: amountText === '' ? 0 : Number(amountText),
      category: get('category'),
    });
  }
  return items;
}

function quote(value) {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCSV(items) {
  const lines = [HEADER.join(',')];
  for (const item of items || []) {
    lines.push(HEADER.map((h) => quote(item[h])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
