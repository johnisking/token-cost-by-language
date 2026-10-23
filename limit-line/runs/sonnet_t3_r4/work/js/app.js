import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { load, save } from './storage.js';
import { drawChart } from './chart.js';

const $ = id => document.getElementById(id);
let items = load();

function render() {
  const { balance } = summarize(items);
  $('balance').textContent = balance.toFixed(2);

  const categories = [...new Set(items.map(i => i.category))].sort();
  const filter = $('filter');
  let current = filter.value || 'All';
  if (current !== 'All' && !categories.includes(current)) current = 'All';
  filter.innerHTML = '';
  for (const c of ['All', ...categories]) {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    filter.appendChild(o);
  }
  filter.value = current;

  const tbody = $('list');
  tbody.innerHTML = '';
  items.forEach((it, index) => {
    if (current !== 'All' && it.category !== current) return;
    const tr = document.createElement('tr');
    for (const v of [it.date, it.description, it.amount.toFixed(2), it.category]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete';
    btn.textContent = 'Delete';
    btn.addEventListener('click', () => {
      items.splice(index, 1);
      save(items);
      render();
    });
    td.appendChild(btn);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });

  drawChart($('chart'), items);
}

$('add').addEventListener('click', e => {
  e.preventDefault();
  const amount = parseFloat($('amount').value);
  if (Number.isNaN(amount)) { $('amount').focus(); return; }
  items.push({
    date: $('date').value,
    description: $('description').value.trim(),
    amount,
    category: $('category').value.trim(),
  });
  save(items);
  $('description').value = '';
  $('amount').value = '';
  render();
});

$('filter').addEventListener('change', render);

$('import').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  items.push(...parseCSV(await file.text()));
  save(items);
  e.target.value = '';
  render();
});

$('export').addEventListener('click', () => {
  const blob = new Blob([toCSV(items)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

render();
