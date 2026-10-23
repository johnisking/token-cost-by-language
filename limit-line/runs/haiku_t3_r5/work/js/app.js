import { parseCSV, toCSV } from './csv.js';
import { summarize, expenseByCategory } from './summary.js';
import { drawBarChart } from './chart.js';

const STORAGE_KEY = 'expense-tracker.items';
const ALL = 'All';

const $ = (selector) => document.querySelector(selector);

const form = $('#form');
const dateInput = $('#date');
const descriptionInput = $('#description');
const amountInput = $('#amount');
const categoryInput = $('#category');
const filterSelect = $('#filter');
const importInput = $('#import');
const exportButton = $('#export');
const listBody = $('#list tbody');
const balanceEl = $('#balance');
const incomeEl = $('#income');
const expenseEl = $('#expense');
const chartCanvas = $('#chart');

let items = loadItems();

function loadItems() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Avoids "-0.00" when floating point noise makes a total slightly negative.
function formatMoney(value) {
  return (Math.round(value * 100) / 100 + 0).toFixed(2);
}

function renderFilter() {
  const current = filterSelect.value || ALL;
  const categories = [...new Set(items.map((item) => item.category))].sort();

  filterSelect.innerHTML = '';
  filterSelect.append(new Option(ALL, ALL));
  for (const category of categories) {
    filterSelect.append(new Option(category, category));
  }
  filterSelect.value = categories.includes(current) ? current : ALL;
}

function renderList() {
  const selected = filterSelect.value;
  listBody.innerHTML = '';

  items.forEach((item, index) => {
    if (selected !== ALL && item.category !== selected) return;

    const row = document.createElement('tr');
    row.dataset.index = index;

    const cells = [item.date, item.description, item.category];
    for (const text of cells) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.append(cell);
    }

    const amountCell = document.createElement('td');
    amountCell.className = `num ${item.amount < 0 ? 'expense' : 'income'}`;
    amountCell.textContent = formatMoney(item.amount);
    row.append(amountCell);

    const actionCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete';
    deleteButton.textContent = 'Delete';
    actionCell.append(deleteButton);
    row.append(actionCell);

    listBody.append(row);
  });
}

function renderSummary() {
  const { income, expense, balance } = summarize(items);
  balanceEl.textContent = formatMoney(balance);
  incomeEl.textContent = formatMoney(income);
  expenseEl.textContent = formatMoney(expense);
}

function renderChart() {
  drawBarChart(chartCanvas, expenseByCategory(items));
}

function render() {
  renderFilter();
  renderList();
  renderSummary();
  renderChart();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const amount = Number(amountInput.value);
  if (amountInput.value === '' || !Number.isFinite(amount)) return;

  items.push({
    date: dateInput.value,
    description: descriptionInput.value.trim(),
    amount,
    category: categoryInput.value.trim(),
  });
  saveItems();
  render();

  form.reset();
  descriptionInput.focus();
});

listBody.addEventListener('click', (event) => {
  const button = event.target.closest('.delete');
  if (!button) return;

  const index = Number(button.closest('tr').dataset.index);
  items.splice(index, 1);
  saveItems();
  render();
});

filterSelect.addEventListener('change', renderList);

importInput.addEventListener('change', async () => {
  const file = importInput.files[0];
  if (!file) return;

  const imported = parseCSV(await file.text());
  items.push(...imported);
  saveItems();
  render();

  importInput.value = '';
});

exportButton.addEventListener('click', () => {
  const blob = new Blob([toCSV(items)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

render();
