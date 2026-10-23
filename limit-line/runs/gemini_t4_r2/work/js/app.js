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

// DOM Elements
const views = {
  '#/transactions': document.getElementById('view-transactions'),
  '#/budgets': document.getElementById('view-budgets'),
  '#/reports': document.getElementById('view-reports'),
};

const navLinks = {
  '#/transactions': document.getElementById('nav-transactions'),
  '#/budgets': document.getElementById('nav-budgets'),
  '#/reports': document.getElementById('nav-reports'),
};

const balanceEl = document.getElementById('balance');
const dateInput = document.getElementById('date');
const descInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const catInput = document.getElementById('category');
const repeatSelect = document.getElementById('repeat');
const untilInput = document.getElementById('until');
const addBtn = document.getElementById('add');

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
const budgetsEl = document.getElementById('budgets');

const reportMonthInput = document.getElementById('report-month');
const reportEl = document.getElementById('report');
const chartCanvas = document.getElementById('chart');

function updateRoute() {
  let hash = window.location.hash || '#/transactions';
  if (!views[hash]) {
    hash = '#/transactions';
  }

  for (const [key, el] of Object.entries(views)) {
    const active = key === hash;
    if (el) {
      el.classList.toggle('hidden', !active);
      el.hidden = !active;
      el.style.display = active ? '' : 'none';
    }
  }

  for (const [key, link] of Object.entries(navLinks)) {
    if (link) {
      link.classList.toggle('active', key === hash);
    }
  }

  renderAll();
}

function getDefaultMonth(items) {
  if (items && items.length > 0 && items[0].date) {
    return items[0].date.slice(0, 7);
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function renderTransactions() {
  const items = history.state();
  const summary = summarize(items);
  balanceEl.textContent = summary.balance.toFixed(2);

  undoBtn.disabled = !history.canUndo();
  redoBtn.disabled = !history.canRedo();

  const query = (searchInput.value || '').trim().toLowerCase();

  let indexed = items.map((item, index) => ({ item, index }));

  if (query) {
    indexed = indexed.filter(({ item }) =>
      String(item.description || '').toLowerCase().includes(query)
    );
  }

  if (sortByAmountDesc) {
    indexed.sort((a, b) => Number(b.item.amount) - Number(a.item.amount));
  }

  listEl.innerHTML = '';
  for (const { item, index } of indexed) {
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
      const next = current.filter((_, i) => i !== index);
      history.push(next);
      saveTransactions(next);
      renderAll();
    });
    tdAction.appendChild(delBtn);

    tr.append(tdDate, tdDesc, tdAmount, tdCat, tdAction);
    listEl.appendChild(tr);
  }
}

function renderBudgets() {
  const items = history.state();
  const month = budgetMonthInput.value || getDefaultMonth(items);
  const checked = checkBudgets(items, budgets, month);

  budgetsEl.innerHTML = '';
  for (const b of checked) {
    const tr = document.createElement('tr');
    if (b.over) {
      tr.classList.add('over');
    }

    const tdCat = document.createElement('td');
    tdCat.textContent = b.category;

    const tdLimit = document.createElement('td');
    tdLimit.textContent = Number(b.limit).toFixed(2);

    const tdSpent = document.createElement('td');
    tdSpent.textContent = Number(b.spent).toFixed(2);

    tr.append(tdCat, tdLimit, tdSpent);
    budgetsEl.appendChild(tr);
  }
}

function renderReports() {
  const items = history.state();
  const month = reportMonthInput.value || getDefaultMonth(items);
  const range = month
    ? { from: `${month}-01`, to: `${month}-31` }
    : undefined;

  const summary = summarize(items, range);
  const byCategory = summary.byCategory;

  reportEl.innerHTML = '';
  const categories = Object.keys(byCategory);
  for (const cat of categories) {
    const tr = document.createElement('tr');
    const tdCat = document.createElement('td');
    tdCat.textContent = cat;
    const tdTotal = document.createElement('td');
    tdTotal.textContent = Number(byCategory[cat]).toFixed(2);
    tr.append(tdCat, tdTotal);
    reportEl.appendChild(tr);
  }

  drawChart(items, month);
}

function drawChart(items, month) {
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');
  if (!ctx) return;

  const width = chartCanvas.width;
  const height = chartCanvas.height;
  ctx.clearRect(0, 0, width, height);

  const prefix = month ? `${month}-` : '';
  const monthItems = (items || []).filter(item =>
    month ? item.date && item.date.startsWith(prefix) : true
  );

  // Calculate expense per category for that month
  const expenseByCategory = {};
  for (const item of monthItems) {
    const amt = Number(item.amount) || 0;
    if (amt < 0) {
      const cat = item.category;
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Math.abs(amt);
    }
  }

  const entries = Object.entries(expenseByCategory).filter(([, val]) => val > 0);
  if (entries.length === 0) {
    return;
  }

  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const padLeft = 50;
  const padRight = 20;
  const padTop = 30;
  const padBottom = 40;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const slotW = chartW / entries.length;
  const barW = Math.max(10, Math.min(80, slotW * 0.6));

  entries.forEach(([cat, val], i) => {
    const barH = (val / maxVal) * chartH;
    const x = padLeft + i * slotW + (slotW - barW) / 2;
    const y = padTop + chartH - barH;

    ctx.fillStyle = '#2563eb';
    ctx.fillRect(x, y, barW, barH);

    ctx.fillStyle = '#0f172a';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cat, x + barW / 2, height - 15);
    ctx.fillText(val.toFixed(2), x + barW / 2, y - 6);
  });
}

function renderAll() {
  renderTransactions();
  renderBudgets();
  renderReports();
}

// Event Listeners
window.addEventListener('hashchange', updateRoute);

for (const [hash, link] of Object.entries(navLinks)) {
  if (link) {
    link.addEventListener('click', () => {
      window.location.hash = hash;
      updateRoute();
    });
  }
}

addBtn.addEventListener('click', () => {
  const date = dateInput.value;
  const description = descInput.value;
  const amount = Number(amountInput.value);
  const category = catInput.value;
  const repeat = repeatSelect.value || 'none';
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

  if (toAdd.length === 0) return;

  const next = [...history.state(), ...toAdd];
  history.push(next);
  saveTransactions(next);
  renderAll();
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
    const next = history.undo();
    saveTransactions(next);
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
    const next = [...history.state(), ...imported];
    history.push(next);
    saveTransactions(next);
    renderAll();
  }
});

exportBtn.addEventListener('click', () => {
  const csv = toCSV(history.state());
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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
  const category = budgetCatInput.value;
  const limit = Number(budgetLimitInput.value);
  if (!category || Number.isNaN(limit)) return;

  budgets = [...budgets, { category, limit }];
  saveBudgets(budgets);
  renderBudgets();
});

budgetMonthInput.addEventListener('change', renderBudgets);
budgetMonthInput.addEventListener('input', renderBudgets);

reportMonthInput.addEventListener('change', renderReports);
reportMonthInput.addEventListener('input', renderReports);

// Initialize
updateRoute();
