import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { load, save } from './storage.js';
import { drawExpenseChart } from './chart.js';

const ALL = 'All';

const $ = (sel) => document.querySelector(sel);
const els = {
  form: $('#tx-form'),
  date: $('#date'),
  description: $('#description'),
  amount: $('#amount'),
  category: $('#category'),
  add: $('#add'),
  list: $('#list'),
  listBody: $('#list tbody'),
  balance: $('#balance'),
  income: $('#income'),
  expense: $('#expense'),
  filter: $('#filter'),
  importInput: $('#import'),
  exportBtn: $('#export'),
  chart: $('#chart'),
  categories: $('#categories'),
};

function normalize(raw) {
  return {
    date: String(raw.date ?? '').trim(),
    description: String(raw.description ?? '').trim(),
    amount: Number(raw.amount) || 0,
    category: String(raw.category ?? '').trim() || 'Uncategorized',
  };
}

const stored = load();
let nextId = stored.reduce((m, it) => Math.max(m, Number(it.id) || 0), 0) + 1;
const seen = new Set();
let items = stored.map((raw) => {
  let id = Number(raw.id);
  if (!id || seen.has(id)) id = nextId++;
  seen.add(id);
  return { ...normalize(raw), id };
});

function persist() {
  save(items);
}

function categoriesOf(list) {
  return [...new Set(list.map((it) => it.category))].sort((a, b) => a.localeCompare(b));
}

function renderFilter() {
  const current = els.filter.value || ALL;
  const cats = categoriesOf(items);
  els.filter.replaceChildren(
    ...[ALL, ...cats].map((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      return opt;
    })
  );
  els.filter.value = current === ALL || cats.includes(current) ? current : ALL;

  els.categories.replaceChildren(
    ...cats.map((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      return opt;
    })
  );
}

function renderList() {
  const filter = els.filter.value || ALL;
  const visible = filter === ALL ? items : items.filter((it) => it.category === filter);

  els.listBody.replaceChildren(
    ...visible.map((it) => {
      const tr = document.createElement('tr');
      tr.dataset.id = it.id;
      tr.dataset.category = it.category;

      const cells = [it.date, it.description, it.amount.toFixed(2), it.category];
      cells.forEach((text, i) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (i === 2) td.className = 'num ' + (it.amount < 0 ? 'neg' : 'pos');
        tr.appendChild(td);
      });

      const td = document.createElement('td');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'delete';
      btn.textContent = 'Delete';
      btn.setAttribute('aria-label', `Delete ${it.description || 'transaction'}`);
      td.appendChild(btn);
      tr.appendChild(td);
      return tr;
    })
  );
}

function renderSummary() {
  const { income, expense, balance } = summarize(items);
  els.balance.textContent = balance.toFixed(2);
  els.balance.classList.toggle('neg', balance < 0);
  els.income.textContent = income.toFixed(2);
  els.expense.textContent = expense.toFixed(2);
}

function render() {
  renderFilter();
  renderList();
  renderSummary();
  drawExpenseChart(els.chart, items);
}

function addItems(newItems) {
  for (const raw of newItems) items.push({ ...normalize(raw), id: nextId++ });
  persist();
  render();
}

function onAdd(event) {
  event.preventDefault();
  const amount = parseFloat(els.amount.value);
  if (!Number.isFinite(amount)) {
    els.amount.focus();
    return;
  }
  addItems([
    {
      date: els.date.value,
      description: els.description.value,
      amount,
      category: els.category.value,
    },
  ]);
  els.description.value = '';
  els.amount.value = '';
  els.description.focus();
}

els.form.addEventListener('submit', onAdd);

els.list.addEventListener('click', (event) => {
  const btn = event.target.closest('button.delete');
  if (!btn) return;
  const id = Number(btn.closest('tr').dataset.id);
  items = items.filter((it) => it.id !== id);
  persist();
  render();
});

els.filter.addEventListener('change', renderList);

els.importInput.addEventListener('change', async () => {
  const file = els.importInput.files && els.importInput.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    addItems(parseCSV(text));
  } catch (err) {
    alert('Could not import CSV: ' + err.message);
  } finally {
    els.importInput.value = '';
  }
});

els.exportBtn.addEventListener('click', () => {
  const csv = toCSV(items.map(({ date, description, amount, category }) => ({ date, description, amount, category })));
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

window.addEventListener('resize', () => drawExpenseChart(els.chart, items));

if (!els.date.value) els.date.value = new Date().toISOString().slice(0, 10);
render();
