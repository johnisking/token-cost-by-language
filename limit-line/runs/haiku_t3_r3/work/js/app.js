import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { drawExpenseChart } from './chart.js';

const STORAGE_KEY = 'expense-tracker.transactions';

const els = {
  form: document.querySelector('#transaction-form'),
  date: document.querySelector('#date'),
  description: document.querySelector('#description'),
  amount: document.querySelector('#amount'),
  category: document.querySelector('#category'),
  filter: document.querySelector('#filter'),
  list: document.querySelector('#list'),
  balance: document.querySelector('#balance'),
  importInput: document.querySelector('#import'),
  exportBtn: document.querySelector('#export'),
  chart: document.querySelector('#chart'),
};

let transactions = loadTransactions();

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function addTransactions(items) {
  transactions.push(...items.map(item => ({ ...item, id: newId() })));
  saveTransactions();
  render();
}

function categories() {
  return [...new Set(transactions.map(t => t.category))].sort();
}

function renderFilterOptions() {
  const selected = els.filter.value;
  const cats = categories();
  els.filter.replaceChildren(
    new Option('All', ''),
    ...cats.map(c => new Option(c, c)),
  );
  els.filter.value = cats.includes(selected) ? selected : '';
}

function renderRow(t) {
  const tr = document.createElement('tr');
  const cells = [t.date, t.description, Number(t.amount).toFixed(2), t.category];
  for (const text of cells) {
    const td = document.createElement('td');
    td.textContent = text;
    tr.append(td);
  }

  const actions = document.createElement('td');
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'delete';
  del.textContent = 'Delete';
  del.dataset.id = t.id;
  actions.append(del);
  tr.append(actions);
  return tr;
}

function renderList() {
  const filter = els.filter.value;
  const visible = filter
    ? transactions.filter(t => t.category === filter)
    : transactions;
  els.list.tBodies[0].replaceChildren(...visible.map(renderRow));
}

function render() {
  const summary = summarize(transactions);
  els.balance.textContent = summary.balance.toFixed(2);
  renderFilterOptions();
  renderList();
  drawExpenseChart(els.chart, transactions);
}

els.form.addEventListener('submit', event => {
  event.preventDefault();
  if (!els.form.reportValidity()) return;

  addTransactions([{
    date: els.date.value,
    description: els.description.value.trim(),
    amount: Number(els.amount.value),
    category: els.category.value.trim(),
  }]);

  els.form.reset();
  els.date.value = today();
  els.description.focus();
});

els.list.tBodies[0].addEventListener('click', event => {
  const button = event.target.closest('button.delete');
  if (!button) return;
  transactions = transactions.filter(t => t.id !== button.dataset.id);
  saveTransactions();
  render();
});

els.filter.addEventListener('change', renderList);

els.importInput.addEventListener('change', async () => {
  const file = els.importInput.files[0];
  if (!file) return;

  const items = parseCSV(await file.text()).map(item => ({
    ...item,
    category: item.category || 'Uncategorized',
  }));
  addTransactions(items);
  els.importInput.value = '';
});

els.exportBtn.addEventListener('click', () => {
  const blob = new Blob([toCSV(transactions)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
});

// Local date as YYYY-MM-DD, the format <input type="date"> uses.
function today() {
  return new Date().toLocaleDateString('en-CA');
}

els.date.value = today();
render();
