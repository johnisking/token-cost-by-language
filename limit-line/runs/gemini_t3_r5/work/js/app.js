import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { drawExpenseChart } from './chart.js';

const STORAGE_KEY = 'expense_tracker_transactions';

let transactions = [];

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
const filterEl = document.getElementById('filter');
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
  const currentFilter = filterEl.value || 'All';
  const categories = [];
  for (const t of transactions) {
    if (t.category && !categories.includes(t.category)) {
      categories.push(t.category);
    }
  }

  filterEl.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = 'All';
  allOption.textContent = 'All';
  filterEl.appendChild(allOption);

  for (const cat of categories) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filterEl.appendChild(opt);
  }

  if (categories.includes(currentFilter)) {
    filterEl.value = currentFilter;
  } else {
    filterEl.value = 'All';
  }
}

function renderList() {
  const selectedCategory = filterEl.value || 'All';
  listEl.innerHTML = '';

  transactions.forEach((item, index) => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) {
      return;
    }

    const tr = document.createElement('tr');

    const dateTd = document.createElement('td');
    dateTd.textContent = item.date;

    const descTd = document.createElement('td');
    descTd.textContent = item.description;

    const catTd = document.createElement('td');
    catTd.textContent = item.category;

    const amountTd = document.createElement('td');
    amountTd.textContent = Number(item.amount).toFixed(2);
    amountTd.className = item.amount >= 0 ? 'amount-positive' : 'amount-negative';

    const actionTd = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      transactions.splice(index, 1);
      saveToStorage();
      render();
    });
    actionTd.appendChild(deleteBtn);

    tr.appendChild(dateTd);
    tr.appendChild(descTd);
    tr.appendChild(catTd);
    tr.appendChild(amountTd);
    tr.appendChild(actionTd);

    listEl.appendChild(tr);
  });
}

function renderSummary() {
  const summary = summarize(transactions);
  balanceEl.textContent = summary.balance.toFixed(2);
  if (incomeEl) incomeEl.textContent = summary.income.toFixed(2);
  if (expenseEl) expenseEl.textContent = summary.expense.toFixed(2);
  drawExpenseChart(chartCanvas, transactions, summary.byCategory);
}

function render() {
  updateFilterOptions();
  renderList();
  renderSummary();
}

function addTransactionFromInputs() {
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

  saveToStorage();
  render();

  descriptionInput.value = '';
  amountInput.value = '';
  categoryInput.value = '';
}

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addTransactionFromInputs();
  });
}

if (addBtn) {
  addBtn.addEventListener('click', (e) => {
    if (!form) {
      e.preventDefault();
      addTransactionFromInputs();
    }
  });
}

if (filterEl) {
  filterEl.addEventListener('change', () => {
    renderList();
  });
}

if (importInput) {
  importInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    let text = '';
    if (typeof file.text === 'function') {
      text = await file.text();
    } else {
      text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
    }

    const imported = parseCSV(text);
    if (imported.length > 0) {
      transactions.push(...imported);
      saveToStorage();
      render();
    }
    importInput.value = '';
  });
}

if (exportBtn) {
  exportBtn.addEventListener('click', () => {
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
  });
}

// Initialize app
transactions = loadFromStorage();
render();
