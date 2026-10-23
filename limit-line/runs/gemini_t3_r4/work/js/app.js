import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';

const STORAGE_KEY = 'expense_tracker_transactions';

let transactions = [];
let currentFilter = 'All';

const form = document.getElementById('transaction-form');
const dateInput = document.getElementById('date');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const addBtn = document.getElementById('add');
const listTable = document.getElementById('list');
const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('income');
const expenseEl = document.getElementById('expense');
const filterSelect = document.getElementById('filter');
const importInput = document.getElementById('import');
const exportBtn = document.getElementById('export');
const chartCanvas = document.getElementById('chart');

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        date: String(item.date ?? ''),
        description: String(item.description ?? ''),
        amount: Number(item.amount) || 0,
        category: String(item.category ?? ''),
      }));
    }
  } catch (err) {
    console.error('Failed to load transactions from localStorage:', err);
  }
  return [];
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions to localStorage:', err);
  }
}

function updateFilterOptions() {
  const categories = Array.from(
    new Set(transactions.map((t) => t.category).filter((c) => c !== ''))
  );

  const previousValue = filterSelect.value || currentFilter;
  filterSelect.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = 'All';
  allOption.textContent = 'All';
  filterSelect.appendChild(allOption);

  for (const cat of categories) {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    filterSelect.appendChild(option);
  }

  if (previousValue === 'All' || categories.includes(previousValue)) {
    filterSelect.value = previousValue;
    currentFilter = previousValue;
  } else {
    filterSelect.value = 'All';
    currentFilter = 'All';
  }
}

function renderList() {
  const tbody = listTable.querySelector('tbody') || listTable;
  tbody.innerHTML = '';

  transactions.forEach((item, index) => {
    if (currentFilter !== 'All' && item.category !== currentFilter) {
      return;
    }

    const tr = document.createElement('tr');

    const dateTd = document.createElement('td');
    dateTd.textContent = item.date;

    const descTd = document.createElement('td');
    descTd.textContent = item.description;

    const categoryTd = document.createElement('td');
    categoryTd.textContent = item.category;

    const amountTd = document.createElement('td');
    amountTd.textContent = Number(item.amount).toFixed(2);
    amountTd.className = item.amount < 0 ? 'amount-expense' : 'amount-income';

    const actionTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      transactions.splice(index, 1);
      saveToStorage();
      render();
    });
    actionTd.appendChild(delBtn);

    tr.appendChild(dateTd);
    tr.appendChild(descTd);
    tr.appendChild(categoryTd);
    tr.appendChild(amountTd);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });
}

function renderSummary() {
  const summary = summarize(transactions);
  balanceEl.textContent = summary.balance.toFixed(2);
  if (incomeEl) incomeEl.textContent = summary.income.toFixed(2);
  if (expenseEl) expenseEl.textContent = summary.expense.toFixed(2);
}

function renderChart() {
  if (!chartCanvas || typeof chartCanvas.getContext !== 'function') return;
  const ctx = chartCanvas.getContext('2d');
  if (!ctx) return;

  const width = chartCanvas.width;
  const height = chartCanvas.height;
  ctx.clearRect(0, 0, width, height);

  // Aggregate expenses by category (negative amounts, or fallback to all categories if needed)
  const expenseByCategory = {};
  for (const item of transactions) {
    const amt = Number(item.amount) || 0;
    const cat = item.category || 'Uncategorized';
    if (amt < 0) {
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Math.abs(amt);
    }
  }

  let entries = Object.entries(expenseByCategory);
  // If no negative amounts exist, check if any categories have net negative or positive amounts
  if (entries.length === 0 && transactions.length > 0) {
    const summary = summarize(transactions);
    entries = Object.entries(summary.byCategory).map(([cat, val]) => [cat, Math.abs(val)]);
  }

  if (entries.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No expense data to display', width / 2, height / 2);
    return;
  }

  const padding = { top: 30, right: 20, bottom: 45, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  // Draw axes
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotHeight);
  ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
  ctx.stroke();

  const barStep = plotWidth / entries.length;
  const barWidth = Math.min(60, Math.max(16, barStep * 0.6));
  const palette = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

  entries.forEach(([category, value], idx) => {
    const barHeight = (value / maxVal) * plotHeight;
    const x = padding.left + idx * barStep + (barStep - barWidth) / 2;
    const y = padding.top + plotHeight - barHeight;

    ctx.fillStyle = palette[idx % palette.length];
    ctx.fillRect(x, y, barWidth, barHeight);

    // Value label
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(2), x + barWidth / 2, y - 6);

    // Category label
    ctx.fillStyle = '#475569';
    ctx.fillText(category, x + barWidth / 2, padding.top + plotHeight + 20);
  });
}

function render() {
  updateFilterOptions();
  renderSummary();
  renderList();
  renderChart();
}

function handleAddTransaction(event) {
  if (event) event.preventDefault();

  const date = dateInput.value.trim();
  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value.trim();

  if (!date && !description && !category && Number.isNaN(amount)) {
    return;
  }

  transactions.push({
    date,
    description,
    amount: Number.isNaN(amount) ? 0 : amount,
    category,
  });

  saveToStorage();
  render();

  descriptionInput.value = '';
  amountInput.value = '';
  categoryInput.value = '';
}

if (form) {
  form.addEventListener('submit', handleAddTransaction);
} else if (addBtn) {
  addBtn.addEventListener('click', handleAddTransaction);
}

filterSelect.addEventListener('change', () => {
  currentFilter = filterSelect.value;
  renderList();
});

importInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const text = await (typeof file.text === 'function'
    ? file.text()
    : new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      }));

  const imported = parseCSV(text);
  if (imported.length > 0) {
    transactions.push(...imported);
    saveToStorage();
    render();
  }
  importInput.value = '';
});

exportBtn.addEventListener('click', () => {
  const csvContent = toCSV(transactions);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

// Initialize
transactions = loadFromStorage();
render();
