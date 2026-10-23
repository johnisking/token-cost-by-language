import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';

const STORAGE_KEY = 'expense_tracker_transactions';

let transactions = loadTransactions();

const form = document.getElementById('transaction-form');
const dateInput = document.getElementById('date');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const addBtn = document.getElementById('add');
const listEl = document.getElementById('list');
const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('income');
const expenseEl = document.getElementById('expense');
const filterSelect = document.getElementById('filter');
const importInput = document.getElementById('import');
const exportBtn = document.getElementById('export');
const chartCanvas = document.getElementById('chart');

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      date: String(item.date ?? ''),
      description: String(item.description ?? ''),
      amount: Number(item.amount) || 0,
      category: String(item.category ?? ''),
    }));
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function updateFilterOptions() {
  const currentFilter = filterSelect.value || 'All';
  const categories = [];
  for (const t of transactions) {
    if (t.category && !categories.includes(t.category)) {
      categories.push(t.category);
    }
  }

  filterSelect.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = 'All';
  allOption.textContent = 'All';
  filterSelect.appendChild(allOption);

  for (const cat of categories) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filterSelect.appendChild(opt);
  }

  if (currentFilter === 'All' || categories.includes(currentFilter)) {
    filterSelect.value = currentFilter;
  } else {
    filterSelect.value = 'All';
  }
}

function renderList() {
  const selectedCategory = filterSelect.value || 'All';
  const tbody = listEl.querySelector('tbody') || listEl;
  tbody.innerHTML = '';

  transactions.forEach((t, index) => {
    if (selectedCategory !== 'All' && t.category !== selectedCategory) {
      return;
    }

    const tr = document.createElement('tr');

    const dateTd = document.createElement('td');
    dateTd.textContent = t.date;

    const descTd = document.createElement('td');
    descTd.textContent = t.description;

    const catTd = document.createElement('td');
    catTd.textContent = t.category;

    const amountTd = document.createElement('td');
    amountTd.textContent = Number(t.amount).toFixed(2);
    amountTd.className = t.amount >= 0 ? 'amount-positive' : 'amount-negative';

    const actionTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      transactions.splice(index, 1);
      saveTransactions();
      updateUI();
    });
    actionTd.appendChild(delBtn);

    tr.append(dateTd, descTd, catTd, amountTd, actionTd);
    tbody.appendChild(tr);
  });
}

function renderSummaryAndChart() {
  const summary = summarize(transactions);
  balanceEl.textContent = summary.balance.toFixed(2);
  if (incomeEl) incomeEl.textContent = summary.income.toFixed(2);
  if (expenseEl) expenseEl.textContent = summary.expense.toFixed(2);

  drawChart();
}

function drawChart() {
  if (!chartCanvas || typeof chartCanvas.getContext !== 'function') return;
  const ctx = chartCanvas.getContext('2d');
  if (!ctx) return;

  const width = chartCanvas.width || 600;
  const height = chartCanvas.height || 300;
  ctx.clearRect(0, 0, width, height);

  const expenseByCategory = {};
  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (amt < 0) {
      const cat = t.category || 'Uncategorized';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Math.abs(amt);
    }
  }

  const entries = Object.entries(expenseByCategory);
  if (entries.length === 0) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No expenses to display', width / 2, height / 2);
    return;
  }

  const padding = { top: 30, right: 20, bottom: 50, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  const slotWidth = plotWidth / entries.length;
  const barWidth = Math.min(60, Math.max(16, slotWidth * 0.6));
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  entries.forEach(([category, value], i) => {
    const barHeight = (value / maxVal) * plotHeight;
    const x = padding.left + i * slotWidth + (slotWidth - barWidth) / 2;
    const y = height - padding.bottom - barHeight;

    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#111827';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(2), x + barWidth / 2, y - 6);

    ctx.fillStyle = '#374151';
    ctx.fillText(category, x + barWidth / 2, height - padding.bottom + 20);
  });
}

function updateUI() {
  updateFilterOptions();
  renderList();
  renderSummaryAndChart();
}

function addTransactionFromInputs(e) {
  if (e) e.preventDefault();

  const date = dateInput.value.trim();
  const description = descriptionInput.value.trim();
  const amountRaw = amountInput.value.trim();
  const category = categoryInput.value.trim();

  if (!date && !description && !amountRaw && !category) {
    return;
  }

  const amount = Number(amountRaw);
  if (Number.isNaN(amount)) {
    return;
  }

  transactions.push({
    date,
    description,
    amount,
    category,
  });

  saveTransactions();
  updateUI();

  dateInput.value = '';
  descriptionInput.value = '';
  amountInput.value = '';
  categoryInput.value = '';
}

if (form) {
  form.addEventListener('submit', addTransactionFromInputs);
}
if (addBtn) {
  addBtn.addEventListener('click', (e) => {
    if (!form) {
      addTransactionFromInputs(e);
    }
  });
}

if (filterSelect) {
  filterSelect.addEventListener('change', () => {
    renderList();
  });
}

if (importInput) {
  importInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const text = typeof file.text === 'function'
      ? await file.text()
      : await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsText(file);
        });
    const imported = parseCSV(text);
    if (imported.length > 0) {
      transactions.push(...imported);
      saveTransactions();
      updateUI();
    }
    importInput.value = '';
  });
}

if (exportBtn) {
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
}

updateUI();
