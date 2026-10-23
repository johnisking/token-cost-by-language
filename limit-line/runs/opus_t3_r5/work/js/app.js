import { parseCSV, toCSV } from './csv.js';
import { summarize, expensesByCategory } from './summary.js';
import { loadItems, saveItems } from './storage.js';
import { drawChart } from './chart.js';

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
  balance: $('#balance'),
  income: $('#income'),
  expense: $('#expense'),
  filter: $('#filter'),
  importInput: $('#import'),
  exportBtn: $('#export'),
  chart: $('#chart'),
  message: $('#message'),
};

let items = loadItems().map(normalize);

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function normalize(item) {
  const amount = Number(item.amount);
  return {
    id: item.id || newId(),
    date: String(item.date ?? ''),
    description: String(item.description ?? ''),
    amount: Number.isFinite(amount) ? amount : 0,
    category: String(item.category ?? '').trim(),
  };
}

function persistAndRender() {
  saveItems(items);
  render();
}

function showMessage(text) {
  els.message.textContent = text;
}

function renderFilter() {
  const current = els.filter.value || ALL;
  const categories = [...new Set(items.map((i) => i.category))].sort((a, b) => a.localeCompare(b));
  els.filter.replaceChildren(
    new Option(ALL, ALL),
    ...categories.map((c) => new Option(c || '(none)', c)),
  );
  els.filter.value = current === ALL || categories.includes(current) ? current : ALL;
}

function renderList() {
  const filter = els.filter.value;
  const visible = filter === ALL || filter === undefined
    ? items
    : items.filter((i) => i.category === filter);

  const tbody = els.list.tBodies[0] || els.list;
  const rows = visible.map((item) => {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id;
    const cells = [item.date, item.description, item.amount.toFixed(2), item.category];
    cells.forEach((text, idx) => {
      const td = document.createElement('td');
      td.textContent = text;
      if (idx === 2) td.className = item.amount < 0 ? 'amount neg' : 'amount pos';
      tr.appendChild(td);
    });
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete';
    btn.textContent = 'Delete';
    btn.setAttribute('aria-label', `Delete ${item.description || 'transaction'}`);
    td.appendChild(btn);
    tr.appendChild(td);
    return tr;
  });
  tbody.replaceChildren(...rows);
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
  drawChart(els.chart, expensesByCategory(items));
}

function addFromForm(event) {
  event.preventDefault();
  const amount = Number(els.amount.value);
  if (els.amount.value.trim() === '' || !Number.isFinite(amount)) {
    showMessage('Please enter a valid amount.');
    els.amount.focus();
    return;
  }
  items.push(normalize({
    date: els.date.value,
    description: els.description.value.trim(),
    amount,
    category: els.category.value,
  }));
  showMessage('');
  els.description.value = '';
  els.amount.value = '';
  persistAndRender();
  els.description.focus();
}

els.form.addEventListener('submit', addFromForm);

els.list.addEventListener('click', (event) => {
  const btn = event.target.closest('button.delete');
  if (!btn) return;
  const id = btn.closest('tr').dataset.id;
  items = items.filter((i) => i.id !== id);
  persistAndRender();
});

els.filter.addEventListener('change', renderList);

els.importInput.addEventListener('change', async () => {
  const file = els.importInput.files[0];
  if (!file) return;
  try {
    const imported = parseCSV(await file.text()).map(normalize);
    items.push(...imported);
    persistAndRender();
    showMessage(`Imported ${imported.length} transaction${imported.length === 1 ? '' : 's'}.`);
  } catch (err) {
    showMessage(`Could not import file: ${err.message}`);
  } finally {
    els.importInput.value = '';
  }
});

els.exportBtn.addEventListener('click', () => {
  const blob = new Blob([toCSV(items)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

window.addEventListener('resize', () => drawChart(els.chart, expensesByCategory(items)));

if (!els.date.value) els.date.value = new Date().toISOString().slice(0, 10);
render();
