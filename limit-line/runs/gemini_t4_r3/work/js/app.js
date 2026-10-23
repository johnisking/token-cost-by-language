import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const STORAGE_TX_KEY = 'budget_app_transactions';
const STORAGE_BUDGETS_KEY = 'budget_app_budgets';

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_TX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTransactions(items) {
  try {
    localStorage.setItem(STORAGE_TX_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

function loadBudgets() {
  try {
    const raw = localStorage.getItem(STORAGE_BUDGETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBudgets(budgets) {
  try {
    localStorage.setItem(STORAGE_BUDGETS_KEY, JSON.stringify(budgets));
  } catch {
    // ignore storage errors
  }
}

const history = createHistory(loadTransactions());
let budgets = loadBudgets();
let sortByAmountDesc = false;

// DOM elements
const views = {
  transactions: document.getElementById('view-transactions'),
  budgets: document.getElementById('view-budgets'),
  reports: document.getElementById('view-reports')
};

const navLinks = {
  transactions: document.getElementById('nav-transactions'),
  budgets: document.getElementById('nav-budgets'),
  reports: document.getElementById('nav-reports')
};

const dateInput = document.getElementById('date');
const descInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const repeatSelect = document.getElementById('repeat');
const untilInput = document.getElementById('until');
const addBtn = document.getElementById('add');

const balanceEl = document.getElementById('balance');
const searchInput = document.getElementById('search');
const sortAmountHeader = document.getElementById('sort-amount');
const listEl = document.getElementById('list');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const importInput = document.getElementById('import');
const exportBtn = document.getElementById('export');

const budgetCatInput = document.getElementById('budget-category');
const budgetLimitInput = document.getElementById('budget-limit');
const budgetAddBtn = document.getElementById('budget-add');
const budgetMonthInput = document.getElementById('budget-month');
const budgetsTableEl = document.getElementById('budgets');

const reportMonthInput = document.getElementById('report-month');
const reportTableEl = document.getElementById('report');
const chartCanvas = document.getElementById('chart');

// Default month inputs if empty
const currentMonthStr = new Date().toISOString().slice(0, 7);
if (budgetMonthInput && !budgetMonthInput.value) {
  budgetMonthInput.value = currentMonthStr;
}
if (reportMonthInput && !reportMonthInput.value) {
  reportMonthInput.value = currentMonthStr;
}

function updateTransactionsState(newItems) {
  history.push(newItems);
  saveTransactions(newItems);
  renderAll();
}

function getActiveMonthForTransactions(items) {
  if (items.length > 0 && items[0].date) {
    return items[0].date.slice(0, 7);
  }
  return currentMonthStr;
}

function switchView() {
  const hash = window.location.hash || '#/transactions';
  let active = 'transactions';
  if (hash === '#/budgets') {
    active = 'budgets';
  } else if (hash === '#/reports') {
    active = 'reports';
  }

  for (const [key, el] of Object.entries(views)) {
    if (!el) continue;
    if (key === active) {
      el.hidden = false;
      el.style.display = '';
    } else {
      el.hidden = true;
      el.style.display = 'none';
    }
  }

  for (const [key, link] of Object.entries(navLinks)) {
    if (!link) continue;
    link.classList.toggle('active', key === active);
  }

  renderAll();
}

function renderTransactions() {
  const allItems = history.state();
  const summary = summarize(allItems);
  balanceEl.textContent = summary.balance.toFixed(2);

  undoBtn.disabled = !history.canUndo();
  redoBtn.disabled = !history.canRedo();

  const query = (searchInput.value || '').trim().toLowerCase();

  // Map with original index so deleting removes the exact transaction
  let indexed = allItems.map((item, idx) => ({ item, idx }));

  if (query) {
    indexed = indexed.filter(({ item }) =>
      (item.description || '').toLowerCase().includes(query)
    );
  }

  if (sortByAmountDesc) {
    indexed.sort((a, b) => Number(b.item.amount) - Number(a.item.amount));
  }

  listEl.innerHTML = '';
  for (const { item, idx } of indexed) {
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = item.date;

    const tdDesc = document.createElement('td');
    tdDesc.textContent = item.description;

    const tdAmount = document.createElement('td');
    tdAmount.textContent = Number(item.amount).toFixed(2);

    const tdCat = document.createElement('td');
    tdCat.textContent = item.category;

    const tdAction = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      const current = history.state();
      const next = current.filter((_, i) => i !== idx);
      updateTransactionsState(next);
    });
    tdAction.appendChild(delBtn);

    tr.append(tdDate, tdDesc, tdAmount, tdCat, tdAction);
    listEl.appendChild(tr);
  }
}

function renderBudgets() {
  const allItems = history.state();
  const month = budgetMonthInput.value || getActiveMonthForTransactions(allItems);
  const statuses = checkBudgets(allItems, budgets, month);

  budgetsTableEl.innerHTML = '';
  for (const st of statuses) {
    const tr = document.createElement('tr');
    if (st.over) {
      tr.classList.add('over');
    }

    const tdCat = document.createElement('td');
    tdCat.textContent = st.category;

    const tdLimit = document.createElement('td');
    tdLimit.textContent = Number(st.limit).toFixed(2);

    const tdSpent = document.createElement('td');
    tdSpent.textContent = Number(st.spent).toFixed(2);

    tr.append(tdCat, tdLimit, tdSpent);
    budgetsTableEl.appendChild(tr);
  }
}

function renderReports() {
  const allItems = history.state();
  const month = reportMonthInput.value || getActiveMonthForTransactions(allItems);
  const range = month
    ? { from: `${month}-01`, to: `${month}-31` }
    : undefined;

  const summary = summarize(allItems, range);
  const entries = Object.entries(summary.byCategory);

  reportTableEl.innerHTML = '';
  for (const [cat, total] of entries) {
    const tr = document.createElement('tr');

    const tdCat = document.createElement('td');
    tdCat.textContent = cat;

    const tdTotal = document.createElement('td');
    tdTotal.textContent = Number(total).toFixed(2);

    tr.append(tdCat, tdTotal);
    reportTableEl.appendChild(tr);
  }

  drawChart(allItems, month);
}

function drawChart(allItems, month) {
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');
  if (!ctx) return;

  const width = chartCanvas.width || 600;
  const height = chartCanvas.height || 300;
  ctx.clearRect(0, 0, width, height);

  // Calculate expense per category for that month
  const prefix = month ? `${month}-` : '';
  const expenseByCat = {};
  for (const item of allItems) {
    if (!prefix || (item.date && item.date.startsWith(prefix))) {
      const amt = Number(item.amount);
      if (amt < 0) {
        expenseByCat[item.category] = (expenseByCat[item.category] || 0) + Math.abs(amt);
      }
    }
  }

  const categories = Object.keys(expenseByCat);
  if (categories.length === 0) {
    return;
  }

  const values = categories.map((c) => expenseByCat[c]);
  const maxVal = Math.max(...values, 1);

  const padding = 40;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;
  const barWidth = Math.max(20, Math.floor(chartW / (categories.length * 2)));
  const step = chartW / categories.length;

  ctx.fillStyle = '#2563eb';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';

  categories.forEach((cat, i) => {
    const val = expenseByCat[cat];
    const barH = Math.max(4, Math.round((val / maxVal) * chartH));
    const x = Math.round(padding + i * step + (step - barWidth) / 2);
    const y = Math.round(height - padding - barH);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x, y, barWidth, barH);

    ctx.fillStyle = '#1e293b';
    ctx.fillText(cat, x + barWidth / 2, height - padding + 16);
    ctx.fillText(val.toFixed(2), x + barWidth / 2, y - 6);
  });
}

function renderAll() {
  renderTransactions();
  renderBudgets();
  renderReports();
}

// Event Listeners
addBtn.addEventListener('click', () => {
  const date = dateInput.value.trim();
  const description = descInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value.trim();
  const repeat = repeatSelect.value;
  const until = untilInput.value.trim();

  if (!date || Number.isNaN(amount)) {
    return;
  }

  let newEntries = [];
  if ((repeat === 'week' || repeat === 'month') && until) {
    newEntries = expandRecurring(
      { date, description, amount, category, every: repeat },
      until
    );
  } else {
    newEntries = [{ date, description, amount, category }];
  }

  if (newEntries.length === 0) {
    return;
  }

  const current = history.state();
  updateTransactionsState([...current, ...newEntries]);

  descInput.value = '';
  amountInput.value = '';
});

searchInput.addEventListener('input', () => {
  renderTransactions();
});

sortAmountHeader.addEventListener('click', () => {
  sortByAmountDesc = true;
  renderTransactions();
});

undoBtn.addEventListener('click', () => {
  if (history.canUndo()) {
    const prev = history.undo();
    saveTransactions(prev);
    renderAll();
  }
});

redoBtn.addEventListener('click', () => {
  if (history.canRedo()) {
    const next = history.redo();
    saveTransactions(next);
    renderAll();
  }
});

importInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const imported = parseCSV(text);
  if (imported.length > 0) {
    const current = history.state();
    updateTransactionsState([...current, ...imported]);
  }
  importInput.value = '';
});

exportBtn.addEventListener('click', () => {
  const csvText = toCSV(history.state());
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

budgetAddBtn.addEventListener('click', () => {
  const category = budgetCatInput.value.trim();
  const limit = Number(budgetLimitInput.value);
  if (!category || Number.isNaN(limit) || limit <= 0) {
    return;
  }

  const existingIdx = budgets.findIndex((b) => b.category === category);
  if (existingIdx >= 0) {
    budgets[existingIdx] = { category, limit };
  } else {
    budgets.push({ category, limit });
  }

  saveBudgets(budgets);
  budgetCatInput.value = '';
  budgetLimitInput.value = '';
  renderBudgets();
});

budgetMonthInput.addEventListener('input', () => {
  renderBudgets();
});
budgetMonthInput.addEventListener('change', () => {
  renderBudgets();
});

reportMonthInput.addEventListener('input', () => {
  renderReports();
});
reportMonthInput.addEventListener('change', () => {
  renderReports();
});

window.addEventListener('hashchange', switchView);

for (const [key, link] of Object.entries(navLinks)) {
  if (!link) continue;
  link.addEventListener('click', () => {
    const targetHash = `#/${key}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    switchView();
  });
}

// Initialize view
if (!window.location.hash) {
  window.location.hash = '#/transactions';
}
switchView();
