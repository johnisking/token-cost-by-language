import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { loadItems, saveItems } from './storage.js';
import { drawChart } from './chart.js';

const $ = id => document.getElementById(id);

const form = $('form');
const dateInput = $('date');
const descriptionInput = $('description');
const amountInput = $('amount');
const categoryInput = $('category');
const list = $('list');
const balanceEl = $('balance');
const incomeEl = $('income');
const expenseEl = $('expense');
const filterSelect = $('filter');
const importInput = $('import');
const exportButton = $('export');
const chart = $('chart');
const categoryOptions = $('category-options');

let nextId = 1;
let items = loadItems().map(normalize);

function normalize(item) {
  const amount = Number(item.amount);
  return {
    id: nextId++,
    date: String(item.date ?? ''),
    description: String(item.description ?? ''),
    amount: Number.isFinite(amount) ? amount : 0,
    category: String(item.category ?? '').trim(),
  };
}

function format(n) {
  const s = (Math.round(n * 100) / 100).toFixed(2);
  return s === '-0.00' ? '0.00' : s;
}

function persist() {
  saveItems(items.map(({ date, description, amount, category }) => ({ date, description, amount, category })));
}

function categories() {
  return [...new Set(items.map(i => i.category))].sort((a, b) => a.localeCompare(b));
}

function renderFilter() {
  const current = filterSelect.value || 'All';
  const cats = categories();
  filterSelect.replaceChildren(new Option('All', 'All'), ...cats.map(c => new Option(c || '(none)', c)));
  filterSelect.value = current === 'All' || cats.includes(current) ? current : 'All';
  categoryOptions.replaceChildren(...cats.map(c => new Option(c)));
}

function renderList() {
  const filter = filterSelect.value;
  const visible = filter === 'All' ? items : items.filter(i => i.category === filter);
  const rows = visible.map(item => {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id;
    const cells = [item.date, item.description, format(item.amount), item.category];
    cells.forEach((text, idx) => {
      const td = document.createElement('td');
      td.textContent = text;
      if (idx === 2) td.className = 'num ' + (item.amount < 0 ? 'negative' : 'positive');
      tr.append(td);
    });
    const td = document.createElement('td');
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete';
    del.textContent = 'Delete';
    del.dataset.id = item.id;
    td.append(del);
    tr.append(td);
    return tr;
  });
  list.replaceChildren(...rows);
}

function renderSummary() {
  const { income, expense, balance } = summarize(items);
  balanceEl.textContent = format(balance);
  incomeEl.textContent = format(income);
  expenseEl.textContent = format(expense);
}

function render() {
  renderFilter();
  renderList();
  renderSummary();
  drawChart(chart, items);
}

function update() {
  persist();
  render();
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const amount = parseFloat(amountInput.value);
  if (!dateInput.value || !descriptionInput.value.trim() || !Number.isFinite(amount) || !categoryInput.value.trim()) {
    form.reportValidity();
    return;
  }
  items.push(normalize({
    date: dateInput.value,
    description: descriptionInput.value.trim(),
    amount,
    category: categoryInput.value,
  }));
  update();
  descriptionInput.value = '';
  amountInput.value = '';
  descriptionInput.focus();
});

list.addEventListener('click', e => {
  const button = e.target.closest('button.delete');
  if (!button) return;
  const id = Number(button.dataset.id);
  items = items.filter(i => i.id !== id);
  update();
});

filterSelect.addEventListener('change', renderList);

importInput.addEventListener('change', async () => {
  const file = importInput.files[0];
  if (!file) return;
  try {
    const parsed = parseCSV(await file.text());
    items.push(...parsed.map(normalize));
    update();
  } catch (err) {
    alert('Could not import CSV: ' + err.message);
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
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
});

dateInput.valueAsDate = new Date();
render();
