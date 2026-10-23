const esc = v => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function toCSV(items) { return ['date,description,amount,category', ...items.map(i => [i.date, i.description, i.amount, i.category].map(esc).join(','))].join('\n') + '\n'; }
function splitLine(line) { const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) { const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur); return out; }
export function parseCSV(text) { const lines = text.split(/\r?\n/).filter(l => l.trim()); lines.shift();
  return lines.map(l => { const [date, description, amount, category] = l.split(','); return { date, description, amount: Number(amount), category }; }); }
