import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';

const STORAGE_KEY = 'expense_tracker_transactions';

let transactions = [];
let currentFilter = 'All';

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function updateFilterOptions() {
  const filterEl = document.getElementById('filter');
  if (!filterEl) return;

  const categories = Array.from(
    new Set(transactions.map((t) => t.category).filter((c) => c && c.trim() !== ''))
  );

  if (currentFilter !== 'All' && !categories.includes(currentFilter)) {
    currentFilter = 'All';
  }

  filterEl.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = 'All';
  allOption.textContent = 'All';
  filterEl.appendChild(allOption);

  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    filterEl.appendChild(option);
  }

  filterEl.value = currentFilter;
}

function renderList() {
  const listEl = document.getElementById('list');
  if (!listEl) return;

  listEl.innerHTML = '';

  transactions.forEach((item, index) => {
    if (currentFilter !== 'All' && item.category !== currentFilter) {
      return;
    }

    const tr = document.createElement('tr');
    tr.dataset.index = String(index);

    const tdDate = document.createElement('td');
    tdDate.textContent = item.date;

    const tdDesc = document.createElement('td');
    tdDesc.textContent = item.description;

    const tdCategory = document.createElement('td');
    tdCategory.textContent = item.category;

    const tdAmount = document.createElement('td');
    const numAmount = Number(item.amount) || 0;
    tdAmount.textContent = numAmount.toFixed(2);
    tdAmount.className = numAmount >= 0 ? 'amount-positive' : 'amount-negative';

    const tdAction = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      transactions.splice(index, 1);
      saveTransactions();
      render();
    });
    tdAction.appendChild(delBtn);

    tr.appendChild(tdDate);
    tr.appendChild(tdDesc);
    tr.appendChild(tdCategory);
    tr.appendChild(tdAmount);
    tr.appendChild(tdAction);

    listEl.appendChild(tr);
  });
}

function renderSummary() {
  const summary = summarize(transactions);
  const balanceEl = document.getElementById('balance');
  if (balanceEl) {
    balanceEl.textContent = summary.balance.toFixed(2);
  }

  const incomeEl = document.getElementById('income');
  if (incomeEl) {
    incomeEl.textContent = summary.income.toFixed(2);
  }

  const expenseEl = document.getElementById('expense');
  if (expenseEl) {
    expenseEl.textContent = summary.expense.toFixed(2);
  }

  renderChart();
}

function renderChart() {
  const canvas = document.getElementById('chart');
  if (!canvas || typeof canvas.getContext !== 'function') return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const expensesByCategory = {};
  for (const item of transactions) {
    const amount = Number(item.amount) || 0;
    if (amount < 0) {
      const cat = item.category || 'Uncategorized';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Math.abs(amount);
    }
  }

  const entries = Object.entries(expensesByCategory);
  if (entries.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No expenses to display', width / 2, height / 2);
    return;
  }

  const padding = { top: 25, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...entries.map(([, val]) => val), 1);

  // Draw axes
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  const slotWidth = chartW / entries.length;
  const barWidth = Math.min(60, slotWidth * 0.6);
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#ec4899', '#8b5cf6', '#06b6d4'];

  entries.forEach(([category, value], idx) => {
    const barHeight = (value / maxVal) * chartH;
    const x = padding.left + idx * slotWidth + (slotWidth - barWidth) / 2;
    const y = height - padding.bottom - barHeight;

    ctx.fillStyle = colors[idx % colors.length];
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(2), x + barWidth / 2, y - 6);
    ctx.fillText(category, x + barWidth / 2, height - padding.bottom + 18);
  });
}

function render() {
  updateFilterOptions();
  renderList();
  renderSummary();
}

function addTransactionFromInputs(e) {
  if (e) e.preventDefault();

  const dateEl = document.getElementById('date');
  const descEl = document.getElementById('description');
  const amountEl = document.getElementById('amount');
  const categoryEl = document.getElementById('category');

  const date = dateEl ? dateEl.value.trim() : '';
  const description = descEl ? descEl.value.trim() : '';
  const amountStr = amountEl ? amountEl.value.trim() : '';
  const category = categoryEl ? categoryEl.value.trim() : '';

  if (!date && !description && !amountStr && !category) return;

  const amount = Number(amountStr);
  if (Number.isNaN(amount)) return;

  transactions.push({
    date,
    description,
    amount,
    category,
  });

  saveTransactions();
  render();

  if (dateEl) dateEl.value = '';
  if (descEl) descEl.value = '';
  if (amountEl) amountEl.value = '';
  if (categoryEl) categoryEl.value = '';
}

function handleImport(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    const imported = parseCSV(text);
    if (imported.length > 0) {
      transactions.push(...imported);
      saveTransactions();
      render();
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

function handleExport() {
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
}

function init() {
  transactions = loadTransactions();

  const form = document.getElementById('transaction-form');
  const addBtn = document.getElementById('add');

  if (form) {
    form.addEventListener('submit', addTransactionFromInputs);
  }
  if (addBtn) {
    addBtn.addEventListener('click', addTransactionFromInputs);
  }

  const filterEl = document.getElementById('filter');
  if (filterEl) {
    filterEl.addEventListener('change', (e) => {
      currentFilter = e.target.value || 'All';
      renderList();
    });
  }

  const importEl = document.getElementById('import');
  if (importEl) {
    importEl.addEventListener('change', handleImport);
  }

  const exportBtn = document.getElementById('export');
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExport);
  }

  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
