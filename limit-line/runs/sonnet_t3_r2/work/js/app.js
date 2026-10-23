import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { load, save } from './storage.js';
import { drawChart } from './chart.js';

const $ = id => document.getElementById(id);
let items = load();

function render() {
  const filter = $('filter');
  const selected = filter.value || 'All';
  const cats = [...new Set(items.map(t => t.category))].sort();
  filter.innerHTML = '';
  for (const c of ['All', ...cats]) {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c === '' ? '(none)' : c;
    filter.appendChild(o);
  }
  filter.value = selected === 'All' || cats.includes(selected) ? selected : 'All';

  const tbody = $('list');
  tbody.innerHTML = '';
  items.forEach((t, i) => {
    if (filter.value !== 'All' && t.category !== filter.value) return;
    const tr = document.createElement('tr');
    for (const v of [t.date, t.description, t.amount.toFixed(2), t.category]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'delete';
    btn.type = 'button';
    btn.textContent = 'Delete';
    btn.addEventListener('click', () => {
      items.splice(i, 1);
      commit();
    });
    td.appendChild(btn);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });

  $('balance').textContent = summarize(items).balance.toFixed(2);
  drawChart($('chart'), items);
}

function commit() {
  save(items);
  render();
}

$('add').addEventListener('click', e => {
  e.preventDefault();
  const amount = parseFloat($('amount').value);
  if (Number.isNaN(amount)) return;
  items.push({
    date: $('date').value,
    description: $('description').value,
    amount,
    category: $('category').value.trim(),
  });
  $('description').value = '';
  $('amount').value = '';
  commit();
});

$('filter').addEventListener('change', render);

$('import').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  items = items.concat(parseCSV(await file.text()));
  e.target.value = '';
  commit();
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
