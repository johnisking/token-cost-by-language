import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { load, save } from './storage.js';
import { drawChart } from './chart.js';

const $ = (id) => document.getElementById(id);
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
let nextId = items.reduce((m, it) => Math.max(m, it.id || 0), 0) + 1;

function addItems(newItems) {
  for (const it of newItems) items.push({ id: nextId++, ...it });
  save(items);
  render();
}

function renderFilter() {
  const current = els.filter.value || 'All';
  const cats = [...new Set(items.map((it) => it.category))].sort();
  els.filter.replaceChildren();
  for (const c of ['All', ...cats]) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c || '(none)';
    els.filter.append(opt);
  }
  els.filter.value = cats.includes(current) ? current : 'All';
}

function renderList() {
  const sel = els.filter.value;
  els.list.replaceChildren();
  for (const it of items) {
    if (sel !== 'All' && it.category !== sel) continue;
    const tr = document.createElement('tr');
    for (const text of [it.date, it.description, it.amount.toFixed(2), it.category]) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    tr.cells[2].className = it.amount < 0 ? 'neg' : 'pos';
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete';
    btn.textContent = 'Delete';
    btn.addEventListener('click', () => {
      items = items.filter((x) => x.id !== it.id);
      save(items);
      render();
    });
    td.append(btn);
    tr.append(td);
    els.list.append(tr);
  }
}

function renderChart() {
  const expenses = items.filter((it) => it.amount < 0);
  const totals = {};
  for (const [cat, sum] of Object.entries(summarize(expenses).byCategory)) {
    totals[cat] = -sum;
  }
  drawChart(els.chart, totals);
}

function render() {
  renderFilter();
  renderList();
  els.balance.textContent = summarize(items).balance.toFixed(2);
  renderChart();
}

els.add.addEventListener('click', () => {
  const amount = parseFloat(els.amount.value);
  if (!els.date.value || Number.isNaN(amount)) return;
  addItems([
    {
      date: els.date.value,
      description: els.description.value.trim(),
      amount,
      category: els.category.value.trim(),
    },
  ]);
  els.description.value = '';
  els.amount.value = '';
});

els.filter.addEventListener('change', renderList);

els.import.addEventListener('change', async () => {
  const file = els.import.files[0];
  if (!file) return;
  addItems(parseCSV(await file.text()));
  els.import.value = '';
});

els.export.addEventListener('click', () => {
  const rows = items.map(({ date, description, amount, category }) => ({
    date,
    description,
    amount,
    category,
  }));
  const url = URL.createObjectURL(new Blob([toCSV(rows)], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

render();
