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
    return Array.isArray(parsed)
      ? parsed.map((item, idx) => ({
          date: item.date,
          description: item.description,
          amount: Number(item.amount),
          category: item.category,
          _id: item._id ?? `${Date.now()}-${idx}-${Math.random()}`,
        }))
      : [];
  } catch {
    return [];
  }
}

function saveTransactions(items) {
  try {
    const clean = items.map(({ date, description, amount, category }) => ({
      date,
      description,
      amount: Number(amount),
      category,
    }));
    localStorage.setItem(STORAGE_TX_KEY, JSON.stringify(clean));
  } catch {
    // ignore storage errors
  }
}

function loadBudgets() {
  try {
    const raw = localStorage.getItem(STORAGE_BUDGETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((b) => ({
          category: b.category,
          limit: Number(b.limit),
        }))
      : [];
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

let nextId = 1;
function withIds(items) {
  return items.map((item) => ({
    date: item.date,
    description: item.description,
    amount: Number(item.amount),
    category: item.category,
    _id: item._id || `tx-${nextId++}`,
  }));
}

const initialTransactions = withIds(loadTransactions());
const history = createHistory(initialTransactions);
let budgets = loadBudgets();
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
const descInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const repeatSelect = document.getElementById('repeat');
const untilInput = document.getElementById('until');
const addBtn = document.getElementById('add');

const searchInput = document.getElementById('search');
const sortAmountHeader = document.getElementById('sort-amount');
const listTable = document.getElementById('list');
const listBody = listTable.querySelector('tbody');

const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const importInput = document.getElementById('import');
const exportBtn = document.getElementById('export');

const budgetMonthInput = document.getElementById('budget-month');
const budgetCategoryInput = document.getElementById('budget-category');
const budgetLimitInput = document.getElementById('budget-limit');
const budgetAddBtn = document.getElementById('budget-add');
const budgetsTable = document.getElementById('budgets');
const budgetsBody = budgetsTable.querySelector('tbody');

const reportMonthInput = document.getElementById('report-month');
const reportTable = document.getElementById('report');
const reportBody = reportTable.querySelector('tbody');
const chartCanvas = document.getElementById('chart');

function getDefaultMonth() {
  const txs = history.state();
  if (txs.length > 0 && txs[0].date && txs[0].date.length >= 7) {
    return txs[0].date.slice(0, 7);
  }
  return new Date().toISOString().slice(0, 7);
}

function updateView(targetHash) {
  const hash = typeof targetHash === 'string' ? targetHash : window.location.hash || '#/transactions';

  const views = [
    { hash: '#/transactions', el: viewTransactions, nav: navTransactions },
    { hash: '#/budgets', el: viewBudgets, nav: navBudgets },
    { hash: '#/reports', el: viewReports, nav: navReports },
  ];

  const activeEntry = views.find((v) => v.hash === hash) || views[0];

  for (const v of views) {
    if (v === activeEntry) {
      v.el.hidden = false;
      v.el.style.display = '';
      v.nav?.classList.add('active');
    } else {
      v.el.hidden = true;
      v.el.style.display = 'none';
      v.nav?.classList.remove('active');
    }
  }

  renderAll();
}

window.addEventListener('hashchange', () => updateView());

for (const [navEl, hash] of [
  [navTransactions, '#/transactions'],
  [navBudgets, '#/budgets'],
  [navReports, '#/reports'],
]) {
  if (navEl) {
    navEl.addEventListener('click', () => {
      if (window.location.hash !== hash) {
        window.location.hash = hash;
      }
      updateView(hash);
    });
  }
}

function commitTransactions(newItems) {
  const itemsWithIds = withIds(newItems);
  history.push(itemsWithIds);
  saveTransactions(itemsWithIds);
  renderAll();
}

function renderTransactions() {
  const allItems = history.state();
  const summary = summarize(allItems);
  balanceEl.textContent = summary.balance.toFixed(2);

  undoBtn.disabled = !history.canUndo();
  redoBtn.disabled = !history.canRedo();

  const query = (searchInput.value || '').trim().toLowerCase();
  let visible = allItems.filter((item) => {
    if (!query) return true;
    return (item.description || '').toLowerCase().includes(query);
  });

  if (sortByAmountDesc) {
    visible = [...visible].sort((a, b) => Number(b.amount) - Number(a.amount));
  }

  listBody.innerHTML = '';
  for (const item of visible) {
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
      const next = history.state().filter((tx) => tx._id !== item._id);
      commitTransactions(next);
    });
    tdAction.appendChild(delBtn);

    tr.append(tdDate, tdDesc, tdAmount, tdCat, tdAction);
    listBody.appendChild(tr);
  }
}

function renderBudgets() {
  const month = budgetMonthInput.value || getDefaultMonth();
  const allItems = history.state();
  const checked = checkBudgets(allItems, budgets, month);

  budgetsBody.innerHTML = '';
  for (const b of checked) {
    const tr = document.createElement('tr');
    if (b.over) {
      tr.classList.add('over');
    }

    const tdCat = document.createElement('td');
    tdCat.textContent = b.category;

    const tdLimit = document.createElement('td');
    tdLimit.textContent = b.limit.toFixed(2);

    const tdSpent = document.createElement('td');
    tdSpent.textContent = b.spent.toFixed(2);

    tr.append(tdCat, tdLimit, tdSpent);
    budgetsBody.appendChild(tr);
  }
}

function renderReports() {
  const month = reportMonthInput.value || getDefaultMonth();
  const allItems = history.state();
  const range = {
    from: `${month}-01`,
    to: `${month}-31`,
  };
  const summary = summarize(allItems, range);
  const byCategory = summary.byCategory;

  reportBody.innerHTML = '';
  const categories = Object.keys(byCategory);
  for (const cat of categories) {
    const tr = document.createElement('tr');
    const tdCat = document.createElement('td');
    tdCat.textContent = cat;
    const tdTotal = document.createElement('td');
    tdTotal.textContent = byCategory[cat].toFixed(2);
    tr.append(tdCat, tdTotal);
    reportBody.appendChild(tr);
  }

  // Draw one bar per expense category of that month on #chart
  const ctx = chartCanvas.getContext('2d');
  if (!ctx) return;

  const width = chartCanvas.width || 600;
  const height = chartCanvas.height || 300;
  ctx.clearRect(0, 0, width, height);

  // Calculate expense per category in that month
  const expenseByCategory = {};
  for (const item of allItems) {
    if (
      typeof item.date === 'string' &&
      item.date.startsWith(`${month}-`) &&
      Number(item.amount) < 0
    ) {
      expenseByCategory[item.category] =
        (expenseByCategory[item.category] || 0) + -Number(item.amount);
    }
  }

  const expenseCategories = Object.keys(expenseByCategory).filter(
    (cat) => expenseByCategory[cat] > 0
  );
  chartCanvas.dataset.bars = String(expenseCategories.length);

  if (expenseCategories.length === 0) {
    return;
  }

  const maxExpense = Math.max(...expenseCategories.map((c) => expenseByCategory[c]), 1);
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const slotWidth = chartWidth / expenseCategories.length;
  const barWidth = Math.max(10, Math.min(80, slotWidth * 0.6));

  ctx.fillStyle = '#2563eb';
  for (let i = 0; i < expenseCategories.length; i++) {
    const cat = expenseCategories[i];
    const val = expenseByCategory[cat];
    const barHeight = Math.max(2, (val / maxExpense) * chartHeight);
    const x = padding + i * slotWidth + (slotWidth - barWidth) / 2;
    const y = height - padding - barHeight;

    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillText(cat, x, height - padding + 16);
  }
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

  if (newEntries.length > 0) {
    const current = history.state();
    commitTransactions([...current, ...newEntries]);
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
    const st = history.undo();
    saveTransactions(st);
    renderAll();
  }
});

redoBtn.addEventListener('click', () => {
  if (history.canRedo()) {
    const st = history.redo();
    saveTransactions(st);
    renderAll();
  }
});

importInput.addEventListener('change', async () => {
  const file = importInput.files && importInput.files[0];
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

  const parsed = parseCSV(text);
  if (parsed.length > 0) {
    const current = history.state();
    commitTransactions([...current, ...parsed]);
  }
});

exportBtn.addEventListener('click', () => {
  const allItems = history.state().map(({ date, description, amount, category }) => ({
    date,
    description,
    amount,
    category,
  }));
  const csv = toCSV(allItems);
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
  const category = budgetCategoryInput.value.trim();
  const limit = Number(budgetLimitInput.value);
  if (!category || Number.isNaN(limit)) {
    return;
  }
  budgets = [...budgets, { category, limit }];
  saveBudgets(budgets);
  renderBudgets();
});

budgetMonthInput.addEventListener('input', renderBudgets);
budgetMonthInput.addEventListener('change', renderBudgets);

reportMonthInput.addEventListener('input', renderReports);
reportMonthInput.addEventListener('change', renderReports);

// Initialize view
updateView();
