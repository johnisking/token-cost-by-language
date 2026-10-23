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

function renderFilter() {
  const current = els.filter.value || 'All';
  const cats = [...new Set(items.map((t) => t.category))].sort();
  els.filter.replaceChildren();
  const all = new Option('All', 'All');
  els.filter.append(all);
  for (const c of cats) els.filter.append(new Option(c || '(none)', c));
  els.filter.value = current === 'All' || cats.includes(current) ? current : 'All';
}

function renderList() {
  const f = els.filter.value;
  const rows = items.filter((t) => f === 'All' || t.category === f);
  els.list.replaceChildren(
    ...rows.map((t) => {
      const tr = document.createElement('tr');
      for (const text of [t.date, t.description, t.amount.toFixed(2), t.category]) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      tr.cells[2].className = t.amount < 0 ? 'neg' : 'pos';
      const td = document.createElement('td');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'delete';
      btn.textContent = 'Delete';
      btn.addEventListener('click', () => {
        items.splice(items.indexOf(t), 1);
        commit();
      });
      td.append(btn);
      tr.append(td);
      return tr;
    })
  );
}

function render() {
  const s = summarize(items);
  els.balance.textContent = s.balance.toFixed(2);
  renderFilter();
  renderList();
  drawChart(els.chart, s.byCategory);
}

function commit() {
  save(items);
  render();
}

els.add.addEventListener('click', () => {
  const amount = parseFloat(els.amount.value);
  if (Number.isNaN(amount)) {
    els.amount.focus();
    return;
  }
  items.push({
    date: els.date.value,
    description: els.description.value.trim(),
    amount,
    category: els.category.value.trim(),
  });
  els.description.value = '';
  els.amount.value = '';
  commit();
});

els.filter.addEventListener('change', renderList);

els.import.addEventListener('change', async () => {
  const file = els.import.files[0];
  if (!file) return;
  items.push(...parseCSV(await file.text()));
  els.import.value = '';
  commit();
});

els.export.addEventListener('click', () => {
  const blob = new Blob([toCSV(items)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

render();
