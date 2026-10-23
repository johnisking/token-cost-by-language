import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { load, save } from './storage.js';
import { drawChart } from './chart.js';

const $ = id => document.getElementById(id);
const els = {
  date: $('date'),
  description: $('description'),
  amount: $('amount'),
  category: $('category'),
  add: $('add'),
  list: $('list'),
  balance: $('balance'),
  filter: $('filter'),
  import: $('import'),
  export: $('export'),
  chart: $('chart'),
};

let items = load();

function renderFilter() {
  const current = els.filter.value || 'All';
  const cats = [...new Set(items.map(i => i.category))].sort();
  els.filter.innerHTML = '';
  for (const c of ['All', ...cats]) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    els.filter.appendChild(opt);
  }
  els.filter.value = cats.includes(current) ? current : 'All';
}

function renderList() {
  const f = els.filter.value;
  els.list.innerHTML = '';
  items.forEach((it, index) => {
    if (f !== 'All' && it.category !== f) return;
    const tr = document.createElement('tr');
    for (const v of [it.date, it.description, it.amount.toFixed(2), it.category]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    tr.cells[2].className = it.amount < 0 ? 'neg' : 'pos';
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete';
    btn.textContent = 'Delete';
    btn.addEventListener('click', () => {
      items.splice(index, 1);
      persistAndRender();
    });
    td.appendChild(btn);
    tr.appendChild(td);
    els.list.appendChild(tr);
  });
}

function render() {
  renderFilter();
  renderList();
  els.balance.textContent = summarize(items).balance.toFixed(2);
  drawChart(els.chart, items);
}

function persistAndRender() {
  save(items);
  render();
}

function normalize(it) {
  return { ...it, category: it.category || 'Uncategorized' };
}

els.add.addEventListener('click', () => {
  const amount = parseFloat(els.amount.value);
  if (!Number.isFinite(amount)) {
    els.amount.focus();
    return;
  }
  items.push(normalize({
    date: els.date.value,
    description: els.description.value.trim(),
    amount,
    category: els.category.value.trim(),
  }));
  els.description.value = '';
  els.amount.value = '';
  els.category.value = '';
  persistAndRender();
});

els.filter.addEventListener('change', renderList);

els.import.addEventListener('change', async () => {
  const file = els.import.files[0];
  if (!file) return;
  items.push(...parseCSV(await file.text()).map(normalize));
  els.import.value = '';
  persistAndRender();
});

els.export.addEventListener('click', () => {
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

els.date.value = new Date().toISOString().slice(0, 10);
render();
