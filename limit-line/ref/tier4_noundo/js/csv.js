const esc = v => { const s = String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function toCSV(items) { return ['date,description,amount,category', ...items.map(i => [i.date, i.description, i.amount, i.category].map(esc).join(','))].join('\n') + '\n'; }
export function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c; }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.slice(1).filter(r => r.length >= 4).map(([date, description, amount, category]) => ({ date, description, amount: Number(amount), category }));
}
