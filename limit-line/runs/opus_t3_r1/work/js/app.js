import { parseCSV, toCSV } from './csv.js';
import { summarize, expensesByCategory } from './summary.js';
import { loadItems, saveItems } from './storage.js';
import { drawBarChart } from './chart.js';

const ALL = 'All';

const $ = (sel) => document.querySelector(sel);
const form = $('#form');
const dateInput = $('#date');
const descInput = $('#description');
const amountInput = $('#amount');
const categoryInput = $('#category');
const list = $('#list');
const listBody = list.tBodies[0] || list;
const balanceEl = $('#balance');
const incomeEl = $('#income');
const expenseEl = $('#expense');
const filterSelect = $('#filter');
const categoryOptions = $('#category-options');
const importInput = $('#import');
const exportButton = $('#export');
const chart = $('#chart');

let nextId = 1;
let items = loadItems().map(normalize);

function normalize(item) {
  const amount = Number(item.amount);
  const id = Number(item.id) >= nextId ? Number(item.id) : nextId;
  nextId = id + 1;
  return {
    id,
    date: String(item.date ?? ''),
    description: String(item.description ?? ''),
    amount: Number.isFinite(amount) ? amount : 0,
    category: String(item.category ?? '').trim(),
  };
}

function persist() {
  saveItems(items);
}

function categories() {
  return [...new Set(items.map((i) => i.category))].sort((a, b) => a.localeCompare(b));
}

function renderFilter() {
  const current = filterSelect.value || ALL;
  const cats = categories();
  filterSelect.replaceChildren(new Option(ALL, ALL), ...cats.map((c) => new Option(c || '(none)', c)));
  filterSelect.value = current === ALL || cats.includes(current) ? current : ALL;

  categoryOptions.replaceChildren(...cats.filter(Boolean).map((c) => new Option(c, c)));
}

function renderList() {
  const filter = filterSelect.value || ALL;
  const visible = filter === ALL ? items : items.filter((i) => i.category === filter);

  const rows = visible.map((item) => {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id;
    const cells = [item.date, item.description, item.amount.toFixed(2), item.category];
    cells.forEach((text, idx) => {
      const td = document.createElement('td');
      td.textContent = text;
      if (idx === 2) td.className = item.amount < 0 ? 'amount negative' : 'amount positive';
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
  listBody.replaceChildren(...rows);
}

function renderSummary() {
  const { income, expense, balance } = summarize(items);
  balanceEl.textContent = balance.toFixed(2);
  balanceEl.classList.toggle('negative', balance < 0);
  incomeEl.textContent = income.toFixed(2);
  expenseEl.textContent = expense.toFixed(2);
  drawBarChart(chart, expensesByCategory(items));
}

function render() {
  renderFilter();
  renderList();
  renderSummary();
}

function addItems(newItems) {
  items.push(...newItems.map(normalize));
  persist();
  render();
}

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseFloat(amountInput.value);
  if (!Number.isFinite(amount)) {
    amountInput.focus();
    return;
  }
  addItems([
    {
      date: dateInput.value || today(),
      description: descInput.value.trim(),
      amount,
      category: categoryInput.value.trim(),
    },
  ]);
  descInput.value = '';
  amountInput.value = '';
  descInput.focus();
});

list.addEventListener('click', (e) => {
  const btn = e.target.closest('button.delete');
  if (!btn) return;
  const id = Number(btn.closest('tr').dataset.id);
  items = items.filter((i) => i.id !== id);
  persist();
  render();
});

filterSelect.addEventListener('change', renderList);

importInput.addEventListener('change', async () => {
  const file = importInput.files && importInput.files[0];
  if (!file) return;
  try {
    addItems(parseCSV(await file.text()));
  } catch (err) {
    alert(`Could not import CSV: ${err.message}`);
  } finally {
    importInput.value = '';
  }
});

exportButton.addEventListener('click', () => {
  const blob = new Blob([toCSV(items)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
});

window.addEventListener('resize', renderSummary);

dateInput.value = today();
render();
