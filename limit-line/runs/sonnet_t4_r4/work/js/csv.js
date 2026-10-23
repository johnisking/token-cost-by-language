const COLUMNS = ['date', 'description', 'amount', 'category'];
const QUOTE = String.fromCharCode(34);

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const endRow = () => {
    row.push(field);
    field = '';
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === QUOTE) {
        if (text[i + 1] === QUOTE) {
          field += QUOTE;
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === QUOTE) {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      if (text[i + 1] === '\n') i++;
      endRow();
    } else if (c === '\n') {
      endRow();
    } else {
      field += c;
    }
    i++;
  }
  if (field !== '' || row.length > 0) endRow();
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

export function parseCSV(text) {
  text = String(text ?? '');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = parseRows(text);
  let order = COLUMNS.map((_, i) => i);
  if (rows.length && rows[0][0].trim().toLowerCase() === 'date') {
    const header = rows.shift().map((h) => h.trim().toLowerCase());
    if (COLUMNS.every((c) => header.includes(c))) order = COLUMNS.map((c) => header.indexOf(c));
  }
  return rows.map((r) => {
    const get = (k) => r[order[k]] ?? '';
    return {
      date: get(0).trim(),
      description: get(1),
      amount: Number(get(2).trim()),
      category: get(3),
    };
  });
}

function quote(value) {
  const s = String(value ?? '');
  if (!/[,\r\n"]/.test(s)) return s;
  return QUOTE + s.split(QUOTE).join(QUOTE + QUOTE) + QUOTE;
}

export function toCSV(items) {
  const lines = [COLUMNS.join(',')];
  for (const it of items) {
    lines.push(COLUMNS.map((c) => quote(it[c])).join(','));
  }
  return lines.join('\n');
}
