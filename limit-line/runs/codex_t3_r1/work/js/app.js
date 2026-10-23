import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';

const STORAGE_KEY = 'expense-tracker-transactions';
const form = document.querySelector('#entry-form');
const dateInput = document.querySelector('#date');
const descriptionInput = document.querySelector('#description');
const amountInput = document.querySelector('#amount');
const categoryInput = document.querySelector('#category');
const list = document.querySelector('#list');
const balance = document.querySelector('#balance');
const filter = document.querySelector('#filter');
const chart = document.querySelector('#chart');
const importInput = document.querySelector('#import');
const exportButton = document.querySelector('#export');
const emptyState = document.querySelector('#empty-state');
const message = document.querySelector('#message');

let items = loadItems();
dateInput.value = today();
render();

function today() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function loadItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object').map(normalizeItem) : [];
  } catch {
    return [];
  }
}

function normalizeItem(item) {
  return {
    date: String(item.date ?? ''),
    description: String(item.description ?? ''),
    amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0,
    category: String(item.category ?? ''),
  };
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function render() {
  const categories = [...new Set(items.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const selected = filter.value;
  filter.replaceChildren(new Option('All', ''));
  for (const category of categories) filter.add(new Option(category, category));
  filter.value = categories.includes(selected) ? selected : '';

  const visible = items.map((item, index) => ({ item, index }))
    .filter(({ item }) => !filter.value || item.category === filter.value)
    .sort((a, b) => b.item.date.localeCompare(a.item.date));
  list.replaceChildren();
  for (const { item, index } of visible) {
    const row = document.createElement('tr');
    const date = document.createElement('td');
    date.textContent = item.date;
    const description = document.createElement('td');
    description.textContent = item.description;
    const category = document.createElement('td');
    const pill = document.createElement('span');
    pill.className = 'category-pill';
    pill.textContent = item.category;
    category.append(pill);
    const amount = document.createElement('td');
    amount.className = `amount-cell ${item.amount >= 0 ? 'positive' : 'negative'}`;
    amount.textContent = item.amount.toFixed(2);
    const actions = document.createElement('td');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Delete ${item.description}`);
    remove.addEventListener('click', () => {
      items.splice(index, 1);
      saveItems();
      render();
    });
    actions.append(remove);
    row.append(date, description, category, amount, actions);
    list.append(row);
  }
  emptyState.hidden = visible.length > 0;
  const summary = summarize(items);
  balance.textContent = summary.balance.toFixed(2);
  const expensesByCategory = {};
  for (const item of items) {
    if (item.amount < 0) expensesByCategory[item.category] = (expensesByCategory[item.category] || 0) + Math.abs(item.amount);
  }
  drawChart(expensesByCategory);
}

function drawChart(byCategory) {
  const context = chart.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const width = chart.clientWidth;
  const height = chart.clientHeight;
  chart.width = Math.max(1, Math.round(width * ratio));
  chart.height = Math.max(1, Math.round(height * ratio));
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);
  const values = Object.entries(byCategory)
    .map(([category, amount]) => [category, Math.max(0, -amount)])
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!values.length) {
    context.fillStyle = '#929a93';
    context.font = '13px DM Sans, Arial, sans-serif';
    context.fillText('Add an expense to see your category breakdown.', 4, 28);
    return;
  }
  const max = Math.max(...values.map(([, amount]) => amount));
  const gap = 14;
  const barWidth = Math.max(28, Math.min(64, (width - gap * (values.length - 1)) / values.length));
  const totalWidth = values.length * barWidth + (values.length - 1) * gap;
  const left = Math.max(0, (width - totalWidth) / 2);
  const baseline = height - 27;
  const topSpace = 19;
  const usable = baseline - topSpace;
  context.font = '11px DM Sans, Arial, sans-serif';
  context.textAlign = 'center';
  values.forEach(([category, amount], index) => {
    const x = left + index * (barWidth + gap);
    const barHeight = Math.max(4, (amount / max) * usable);
    context.fillStyle = '#e8f1eb';
    roundRect(context, x, baseline - barHeight, barWidth, barHeight, 5);
    context.fill();
    context.fillStyle = '#286b4d';
    context.fillText(amount.toFixed(0), x + barWidth / 2, Math.max(12, baseline - barHeight - 5));
    context.fillStyle = '#758078';
    const label = category.length > 10 ? `${category.slice(0, 9)}…` : category;
    context.fillText(label, x + barWidth / 2, height - 8);
  });
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const amount = Number(amountInput.value);
  if (!Number.isFinite(amount)) return;
  items.push(normalizeItem({
    date: dateInput.value,
    description: descriptionInput.value.trim(),
    amount,
    category: categoryInput.value.trim(),
  }));
  saveItems();
  form.reset();
  dateInput.value = today();
  render();
  descriptionInput.focus();
});

filter.addEventListener('change', render);
window.addEventListener('resize', render);

importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  try {
    const imported = parseCSV(await file.text()).map(normalizeItem);
    items.push(...imported);
    saveItems();
    render();
    message.classList.remove('error');
    message.textContent = `Imported ${imported.length} transaction${imported.length === 1 ? '' : 's'}.`;
  } catch {
    message.classList.add('error');
    message.textContent = 'Could not read that CSV file.';
  }
  importInput.value = '';
});

exportButton.addEventListener('click', () => {
  const blob = new Blob([toCSV(items)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  link.click();
  URL.revokeObjectURL(url);
});
