export function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ',') { row.push(field); field = ""; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  while (rows.length && rows[rows.length - 1].every(value => value.trim() === "")) rows.pop();
  if (!rows.length) return [];
  const headers = rows.shift().map(value => value.replace(/^\uFEFF/, "").trim().toLowerCase());
  const indexes = ["date", "description", "amount", "category"].map(name => headers.indexOf(name));
  if (indexes.some(index => index < 0)) throw new Error("CSV must have date,description,amount,category columns.");
  return rows.filter(values => values.some(value => value.trim() !== "")).map((values, rowIndex) => {
    const amountText = (values[indexes[2]] ?? "").trim();
    const amount = Number(amountText);
    if (amountText === "" || !Number.isFinite(amount)) throw new Error(`Invalid amount on CSV row ${rowIndex + 2}.`);
    return { date: values[indexes[0]] ?? "", description: values[indexes[1]] ?? "", amount, category: values[indexes[3]] ?? "" };
  });
}

export function toCSV(items) {
  const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return ["date,description,amount,category", ...items.map(item => [item.date, item.description, item.amount, item.category].map(quote).join(","))].join("\r\n");
}
