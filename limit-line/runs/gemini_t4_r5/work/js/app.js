import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const STORAGE_TX_KEY = 'budget_app_transactions';
const STORAGE_BUDGETS_KEY = 'budget_app_budgets';

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

let transactions = loadJSON(STORAGE_TX_KEY, []);
let budgets = loadJSON(STORAGE_BUDGETS_KEY, []);
const history = createHistory(transactions);

let sortByAmountDesc = false;

// Elements
const viewTransactions = document.getElementById('view-transactions');
const viewBudgets = document.getElementById('view-budgets');
const viewReports = document.getElementById('view-reports');

const navTransactions = document.getElementById('nav-transactions');
const navBudgets = document.getElementById('nav-budgets');
const navReports = document.getElementById('nav-reports');

const balanceEl = document.getElementById('balance');

const dateInput = document.getElementById('date');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const repeatSelect = document.getElementById('repeat');
const untilInput = document.getElementById('until');
const addBtn = document.getElementById('add');

const searchInput = document.getElementById('search');
const sortAmountHeader = document.getElementById('sort-amount');
const listBody = document.getElementById('list-body');

const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const importInput = document.getElementById('import');
const exportBtn = document.getElementById('export');

const budgetCategoryInput = document.getElementById('budget-category');
const budgetLimitInput = document.getElementById('budget-limit');
const budgetAddBtn = document.getElementById('budget-add');
const budgetMonthInput = document.getElementById('budget-month');
const budgetsBody = document.getElementById('budgets-body');

const reportMonthInput = document.getElementById('report-month');
const reportBody = document.getElementById('report-body');
const chartCanvas = document.getElementById('chart');

function updateView() {
  const hash = window.location.hash || '#/transactions';
  let active = 'transactions';
  if (hash === '#/budgets') {
    active = 'budgets';
  } else if (hash === '#/reports') {
    active = 'reports';
  }

  const views = [
    { name: 'transactions', el: viewTransactions, nav: navTransactions },
    { name: 'budgets', el: viewBudgets, nav: navBudgets },
    { name: 'reports', el: viewReports, nav: navReports },
  ];

  for (const v of views) {
    const isActive = v.name === active;
    v.el.hidden = !isActive;
    v.el.style.display = isActive ? 'block' : 'none';
    if (v.nav) {
      v.nav.classList.toggle('active', isActive);
    }
  }

  renderAll();
}

function commitTransactions(nextTransactions) {
  transactions = nextTransactions;
  history.push(transactions);
  saveJSON(STORAGE_TX_KEY, transactions);
  renderAll();
}

function renderTransactions() {
  const summary = summarize(transactions);
  balanceEl.textContent = summary.balance.toFixed(2);

  const query = (searchInput.value || '').trim().toLowerCase();
  let indexed = transactions.map((item, idx) => ({ item, idx }));

  if (query) {
    indexed = indexed.filter(({ item }) =>
      String(item.description || '').toLowerCase().includes(query)
    );
  }

  if (sortByAmountDesc) {
    indexed.sort((a, b) => Number(b.item.amount) - Number(a.item.amount));
  }

  listBody.innerHTML = '';
  for (const { item, idx } of indexed) {
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = item.date;

    const tdDesc = document.createElement('td');
    tdDesc.textContent = item.description;

    const tdAmount = document.createElement('td');
    tdAmount.textContent = Number(item.amount).toFixed(2);

    const tdCategory = document.createElement('td');
    tdCategory.textContent = item.category;

    const tdAction = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      const next = transactions.filter((_, i) => i !== idx);
      commitTransactions(next);
    });
    tdAction.appendChild(delBtn);

    tr.append(tdDate, tdDesc, tdAmount, tdCategory, tdAction);
    listBody.appendChild(tr);
  }
}

function renderBudgets() {
  const month = budgetMonthInput.value || '';
  const results = checkBudgets(transactions, budgets, month);

  budgetsBody.innerHTML = '';
  for (const res of results) {
    const tr = document.createElement('tr');
    if (res.over) {
      tr.classList.add('over');
    }

    const tdCat = document.createElement('td');
    tdCat.textContent = res.category;

    const tdLimit = document.createElement('td');
    tdLimit.textContent = Number(res.limit).toFixed(2);

    const tdSpent = document.createElement('td');
    tdSpent.textContent = Number(res.spent).toFixed(2);

    tr.append(tdCat, tdLimit, tdSpent);
    budgetsBody.appendChild(tr);
  }
}

function renderReports() {
  const month = reportMonthInput.value || '';
  const range = month ? { from: `${month}-01`, to: `${month}-31` } : undefined;
  const summary = summarize(transactions, range);

  reportBody.innerHTML = '';
  const categories = Object.keys(summary.byCategory);
  for (const cat of categories) {
    const total = summary.byCategory[cat];
    const tr = document.createElement('tr');

    const tdCat = document.createElement('td');
    tdCat.textContent = cat;

    const tdTotal = document.createElement('td');
    tdTotal.textContent = total.toFixed(2);

    tr.append(tdCat, tdTotal);
    reportBody.appendChild(tr);
  }

  // Draw one bar per expense category of that month
  const ctx = chartCanvas.getContext('2d');
  if (!ctx) return;

  const width = chartCanvas.width || 600;
  const height = chartCanvas.height || 300;
  ctx.clearRect(0, 0, width, height);

  // Determine expense categories in that month
  const expenseMap = {};
  for (const item of transactions) {
    if (month && (!item.date || !item.date.startsWith(month))) continue;
    const amt = Number(item.amount) || 0;
    if (amt < 0) {
      const cat = item.category || '';
      expenseMap[cat] = (expenseMap[cat] || 0) + Math.abs(amt);
    }
  }

  const expenseEntries = Object.entries(expenseMap).filter(([, val]) => val > 0);
  if (expenseEntries.length === 0) return;

  const maxVal = Math.max(...expenseEntries.map(([, val]) => val), 1);
  const padding = 30;
  const availWidth = width - padding * 2;
  const availHeight = height - padding * 2;
  const slotWidth = availWidth / expenseEntries.length;
  const barWidth = Math.max(10, Math.min(80, slotWidth * 0.6));

  ctx.fillStyle = '#ef4444';
  expenseEntries.forEach(([cat, val], idx) => {
    const barHeight = Math.max(4, (val / maxVal) * availHeight);
    const x = padding + idx * slotWidth + (slotWidth - barWidth) / 2;
    const y = height - padding - barHeight;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#0f172a';
    ctx.font = '12px sans-serif';
    ctx.fillText(cat, x, height - 10);
    ctx.fillStyle = '#ef4444';
  });
}

function renderAll() {
  renderTransactions();
  renderBudgets();
  renderReports();
}

// Event listeners
window.addEventListener('hashchange', updateView);

[
  { el: navTransactions, hash: '#/transactions' },
  { el: navBudgets, hash: '#/budgets' },
  { el: navReports, hash: '#/reports' },
].forEach(({ el, hash }) => {
  if (el) {
    el.addEventListener('click', () => {
      if (window.location.hash !== hash) {
        window.location.hash = hash;
      }
      updateView();
    });
  }
});

addBtn.addEventListener('click', () => {
  const date = dateInput.value;
  const description = descriptionInput.value;
  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const repeat = repeatSelect.value;
  const until = untilInput.value;

  if (!date || Number.isNaN(amount)) return;

  let toAdd = [];
  if (repeat === 'week' || repeat === 'month') {
    toAdd = expandRecurring(
      { date, description, amount, category, every: repeat },
      until || date
    );
  } else {
    toAdd = [{ date, description, amount, category }];
  }

  if (toAdd.length > 0) {
    commitTransactions([...transactions, ...toAdd]);
  }
});

searchInput.addEventListener('input', renderTransactions);
searchInput.addEventListener('change', renderTransactions);

sortAmountHeader.addEventListener('click', () => {
  sortByAmountDesc = true;
  renderTransactions();
});

undoBtn.addEventListener('click', () => {
  if (history.canUndo()) {
    transactions = history.undo();
    saveJSON(STORAGE_TX_KEY, transactions);
    renderAll();
  }
});

redoBtn.addEventListener('click', () => {
  if (history.canRedo()) {
    transactions = history.redo();
    saveJSON(STORAGE_TX_KEY, transactions);
    renderAll();
  }
});

importInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const text =
    typeof file.text === 'function'
      ? await file.text()
      : await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsText(file);
        });

  const imported = parseCSV(text);
  if (imported.length > 0) {
    commitTransactions([...transactions, ...imported]);
  }
});

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
  setTimeout(() => URL.revokeObjectURL(url), 100);
});

budgetAddBtn.addEventListener('click', () => {
  const category = budgetCategoryInput.value.trim();
  const limit = Number(budgetLimitInput.value);
  if (!category || Number.isNaN(limit)) return;

  budgets = [...budgets, { category, limit }];
  saveJSON(STORAGE_BUDGETS_KEY, budgets);
  renderBudgets();
});

budgetMonthInput.addEventListener('input', renderBudgets);
budgetMonthInput.addEventListener('change', renderBudgets);

reportMonthInput.addEventListener('input', renderReports);
reportMonthInput.addEventListener('change', renderReports);

// Initial render
updateView();
