import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';

const STORAGE_KEY = 'expense_tracker_transactions';

let transactions = [];
let nextId = 1;

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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        transactions = parsed.map((item) => ({
          id: nextId++,
          date: String(item.date ?? ''),
          description: String(item.description ?? ''),
          amount: Number(item.amount) || 0,
          category: String(item.category ?? ''),
        }));
      }
    }
  } catch (err) {
    console.error('Failed to load transactions from localStorage:', err);
    transactions = [];
  }
}

function saveToStorage() {
  try {
    const data = transactions.map(({ date, description, amount, category }) => ({
      date,
      description,
      amount,
      category,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save transactions to localStorage:', err);
  }
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
  const selectedCategory = filterSelect.value;
  let tbody = listTable.querySelector('tbody');
  if (!tbody) {
    tbody = document.createElement('tbody');
    listTable.appendChild(tbody);
  }
  tbody.innerHTML = '';

  const filtered =
    !selectedCategory || selectedCategory === 'All'
      ? transactions
      : transactions.filter((t) => t.category === selectedCategory);

  for (const item of filtered) {
    const tr = document.createElement('tr');
    tr.dataset.id = String(item.id);

    const tdDate = document.createElement('td');
    tdDate.textContent = item.date;

    const tdDesc = document.createElement('td');
    tdDesc.textContent = item.description;

    const tdCategory = document.createElement('td');
    tdCategory.textContent = item.category;

    const tdAmount = document.createElement('td');
    tdAmount.textContent = Number(item.amount).toFixed(2);
    tdAmount.className = item.amount < 0 ? 'amount-expense' : 'amount-income';

    const tdActions = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      deleteTransaction(item.id);
    });
    tdActions.appendChild(delBtn);

    tr.appendChild(tdDate);
    tr.appendChild(tdDesc);
    tr.appendChild(tdCategory);
    tr.appendChild(tdAmount);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }
}

function renderSummary() {
  const summary = summarize(transactions);
  balanceEl.textContent = summary.balance.toFixed(2);
  if (incomeEl) incomeEl.textContent = summary.income.toFixed(2);
  if (expenseEl) expenseEl.textContent = summary.expense.toFixed(2);
  renderChart(summary);
}

function renderChart(summary) {
  if (!chartCanvas || typeof chartCanvas.getContext !== 'function') return;
  const ctx = chartCanvas.getContext('2d');
  if (!ctx) return;

  const width = chartCanvas.width || 600;
  const height = chartCanvas.height || 300;
  ctx.clearRect(0, 0, width, height);

  // Calculate expense per category (negative transactions summed as positive, or fallback to byCategory)
  const expenseByCategory = {};
  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (amt < 0) {
      const cat = t.category || 'Uncategorized';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Math.abs(amt);
    }
  }

  let entries = Object.entries(expenseByCategory).filter(([, val]) => val > 0);
  if (entries.length === 0 && summary && summary.byCategory) {
    entries = Object.entries(summary.byCategory)
      .filter(([, val]) => val !== 0)
      .map(([cat, val]) => [cat, Math.abs(val)]);
  }

  if (entries.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No expenses to display', width / 2, height / 2);
    return;
  }

  const padding = { top: 30, right: 20, bottom: 50, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  // Draw axes
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartH);
  ctx.lineTo(padding.left + chartW, padding.top + chartH);
  ctx.stroke();

  const barStep = chartW / entries.length;
  const barWidth = Math.min(60, Math.max(16, barStep * 0.6));
  const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

  entries.forEach(([cat, val], idx) => {
    const barHeight = (val / maxVal) * chartH;
    const x = padding.left + idx * barStep + (barStep - barWidth) / 2;
    const y = padding.top + chartH - barHeight;

    ctx.fillStyle = colors[idx % colors.length];
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#1e293b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(val.toFixed(2), x + barWidth / 2, y - 6);
    ctx.fillText(cat, x + barWidth / 2, padding.top + chartH + 20);
  });
}

function renderAll() {
  updateFilterOptions();
  renderList();
  renderSummary();
}

function addTransactionFromForm(e) {
  if (e) e.preventDefault();
  const date = dateInput.value.trim();
  const description = descriptionInput.value.trim();
  const amountVal = parseFloat(amountInput.value);
  const category = categoryInput.value.trim();

  if (Number.isNaN(amountVal)) return;

  transactions.push({
    id: nextId++,
    date,
    description,
    amount: amountVal,
    category,
  });

  saveToStorage();
  renderAll();

  descriptionInput.value = '';
  amountInput.value = '';
  categoryInput.value = '';
}

function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveToStorage();
  renderAll();
}

function handleImport(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const processText = (text) => {
    const imported = parseCSV(text);
    for (const item of imported) {
      transactions.push({
        id: nextId++,
        date: String(item.date ?? ''),
        description: String(item.description ?? ''),
        amount: Number(item.amount) || 0,
        category: String(item.category ?? ''),
      });
    }
    saveToStorage();
    renderAll();
    importInput.value = '';
  };

  if (typeof file.text === 'function') {
    file.text().then(processText);
  } else {
    const reader = new FileReader();
    reader.onload = (ev) => processText(String(ev.target.result || ''));
    reader.readAsText(file);
  }
}

function handleExport() {
  const csvContent = toCSV(transactions);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

form.addEventListener('submit', addTransactionFromForm);
filterSelect.addEventListener('change', () => {
  renderList();
});
importInput.addEventListener('change', handleImport);
exportBtn.addEventListener('click', handleExport);

loadFromStorage();
renderAll();
