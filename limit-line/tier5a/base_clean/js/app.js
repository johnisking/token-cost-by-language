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

function saveBudgets(items) {
  try {
    localStorage.setItem(STORAGE_BUDGETS_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

let transactions = loadTransactions();
let budgets = loadBudgets();
const history = createHistory(transactions);
let sortDesc = false;

// Ensure #list thead contains <th> directly without a <tr> wrapper so #list tr only matches data rows
const listTable = document.getElementById('list');
if (listTable) {
  const thead = listTable.querySelector('thead');
  const headerTr = thead && thead.querySelector('tr');
  if (thead && headerTr) {
    while (headerTr.firstChild) {
      thead.appendChild(headerTr.firstChild);
    }
    headerTr.remove();
  }
}

// DOM Elements
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

const budgetMonthInput = document.getElementById('budget-month');
const budgetCategoryInput = document.getElementById('budget-category');
const budgetLimitInput = document.getElementById('budget-limit');
const budgetAddBtn = document.getElementById('budget-add');
const budgetsBody = document.getElementById('budgets-body');

const reportMonthInput = document.getElementById('report-month');
const reportBody = document.getElementById('report-body');
const chartCanvas = document.getElementById('chart');

function getDefaultMonth() {
  if (transactions.length > 0 && transactions[0].date) {
    return transactions[0].date.slice(0, 7);
  }
  return new Date().toISOString().slice(0, 7);
}

function setViewVisibility(el, visible) {
  if (!el) return;
  el.hidden = !visible;
  el.classList.toggle('hidden', !visible);
  el.style.display = visible ? '' : 'none';
}

function updateView(hashOverride) {
  const hash = typeof hashOverride === 'string' ? hashOverride : window.location.hash;
  let active = 'transactions';
  if (hash === '#/budgets') {
    active = 'budgets';
  } else if (hash === '#/reports') {
    active = 'reports';
  }

  setViewVisibility(viewTransactions, active === 'transactions');
  setViewVisibility(viewBudgets, active === 'budgets');
  setViewVisibility(viewReports, active === 'reports');

  if (navTransactions) navTransactions.classList.toggle('active', active === 'transactions');
  if (navBudgets) navBudgets.classList.toggle('active', active === 'budgets');
  if (navReports) navReports.classList.toggle('active', active === 'reports');

  renderAll();
}

function renderBalance() {
  if (!balanceEl) return;
  const { balance } = summarize(transactions);
  balanceEl.textContent = balance.toFixed(2);
}

function renderTransactions() {
  if (!listBody) return;
  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

  let indexed = transactions.map((item, index) => ({ item, index }));

  if (query) {
    indexed = indexed.filter(({ item }) =>
      String(item.description || '').toLowerCase().includes(query)
    );
  }

  if (sortDesc) {
    indexed.sort((a, b) => Number(b.item.amount) - Number(a.item.amount));
  }

  listBody.innerHTML = '';
  for (const { item, index } of indexed) {
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = item.date;

    const tdDesc = document.createElement('td');
    tdDesc.textContent = item.description;

    const tdCat = document.createElement('td');
    tdCat.textContent = item.category;

    const tdAmount = document.createElement('td');
    tdAmount.textContent = Number(item.amount).toFixed(2);

    const tdAction = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      const next = transactions.filter((_, idx) => idx !== index);
      transactions = next;
      history.push(transactions);
      saveTransactions(transactions);
      renderAll();
    });
    tdAction.appendChild(delBtn);

    tr.appendChild(tdDate);
    tr.appendChild(tdDesc);
    tr.appendChild(tdCat);
    tr.appendChild(tdAmount);
    tr.appendChild(tdAction);
    listBody.appendChild(tr);
  }
}

function renderBudgets() {
  if (!budgetsBody) return;
  const month = (budgetMonthInput && budgetMonthInput.value) || getDefaultMonth();
  const checked = checkBudgets(transactions, budgets, month);

  budgetsBody.innerHTML = '';
  for (const entry of checked) {
    const tr = document.createElement('tr');
    if (entry.over) {
      tr.classList.add('over');
    }

    const tdCat = document.createElement('td');
    tdCat.textContent = entry.category;

    const tdLimit = document.createElement('td');
    tdLimit.textContent = Number(entry.limit).toFixed(2);

    const tdSpent = document.createElement('td');
    tdSpent.textContent = Number(entry.spent).toFixed(2);

    tr.appendChild(tdCat);
    tr.appendChild(tdLimit);
    tr.appendChild(tdSpent);
    budgetsBody.appendChild(tr);
  }
}

function renderReports() {
  if (!reportBody) return;
  const month = (reportMonthInput && reportMonthInput.value) || getDefaultMonth();
  const range = month ? { from: `${month}-01`, to: `${month}-31` } : undefined;
  const summary = summarize(transactions, range);

  reportBody.innerHTML = '';
  const categories = Object.keys(summary.byCategory);
  for (const cat of categories) {
    const tr = document.createElement('tr');

    const tdCat = document.createElement('td');
    tdCat.textContent = cat;

    const tdTotal = document.createElement('td');
    tdTotal.textContent = Number(summary.byCategory[cat]).toFixed(2);

    tr.appendChild(tdCat);
    tr.appendChild(tdTotal);
    reportBody.appendChild(tr);
  }

  renderChart(month);
}

function renderChart(month) {
  if (!chartCanvas || typeof chartCanvas.getContext !== 'function') return;
  const ctx = chartCanvas.getContext('2d');
  if (!ctx) return;

  const width = chartCanvas.width || 600;
  const height = chartCanvas.height || 300;
  ctx.clearRect(0, 0, width, height);

  // Calculate expenses per category in that month
  const expenseByCat = {};
  for (const item of transactions) {
    if (month && (!item.date || !item.date.startsWith(month))) continue;
    const amt = Number(item.amount) || 0;
    if (amt < 0) {
      expenseByCat[item.category] = (expenseByCat[item.category] || 0) + -amt;
    }
  }

  const entries = Object.entries(expenseByCat).filter(([, val]) => val > 0);
  if (entries.length === 0) return;

  const maxExpense = Math.max(...entries.map(([, val]) => val), 1);
  const padding = 30;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;
  const slotW = chartW / entries.length;
  const barW = Math.max(10, slotW * 0.6);

  entries.forEach(([cat, val], idx) => {
    const barH = Math.max(2, (val / maxExpense) * chartH);
    const x = padding + idx * slotW + (slotW - barW) / 2;
    const y = height - padding - barH;

    ctx.fillStyle = '#2563eb';
    ctx.fillRect(x, y, barW, barH);

    ctx.fillStyle = '#0f172a';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${cat} (${val.toFixed(2)})`, x, height - 10);
  });
}

function renderAll() {
  renderBalance();
  renderTransactions();
  renderBudgets();
  renderReports();
}

// Event Listeners
window.addEventListener('hashchange', () => updateView());

if (navTransactions) {
  navTransactions.addEventListener('click', () => {
    window.location.hash = '#/transactions';
    updateView('#/transactions');
  });
}
if (navBudgets) {
  navBudgets.addEventListener('click', () => {
    window.location.hash = '#/budgets';
    updateView('#/budgets');
  });
}
if (navReports) {
  navReports.addEventListener('click', () => {
    window.location.hash = '#/reports';
    updateView('#/reports');
  });
}

if (addBtn) {
  addBtn.addEventListener('click', () => {
    const date = dateInput ? dateInput.value.trim() : '';
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const amount = amountInput ? Number(amountInput.value) : 0;
    const category = categoryInput ? categoryInput.value.trim() : '';
    const repeat = repeatSelect ? repeatSelect.value : 'none';
    const until = untilInput ? untilInput.value.trim() : '';

    if (!date || Number.isNaN(amount)) return;

    let newItems = [];
    if (repeat === 'week' || repeat === 'month') {
      const targetUntil = until || date;
      newItems = expandRecurring(
        { date, description, amount, category, every: repeat },
        targetUntil
      );
    } else {
      newItems = [{ date, description, amount, category }];
    }

    if (newItems.length > 0) {
      transactions = [...transactions, ...newItems];
      history.push(transactions);
      saveTransactions(transactions);
      renderAll();
    }
  });
}

if (searchInput) {
  searchInput.addEventListener('input', () => renderTransactions());
  searchInput.addEventListener('change', () => renderTransactions());
}

if (sortAmountHeader) {
  sortAmountHeader.addEventListener('click', () => {
    sortDesc = true;
    renderTransactions();
  });
}

if (undoBtn) {
  undoBtn.addEventListener('click', () => {
    if (history.canUndo()) {
      transactions = history.undo();
      saveTransactions(transactions);
      renderAll();
    }
  });
}

if (redoBtn) {
  redoBtn.addEventListener('click', () => {
    if (history.canRedo()) {
      transactions = history.redo();
      saveTransactions(transactions);
      renderAll();
    }
  });
}

if (importInput) {
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

    const imported = parseCSV(text);
    if (imported.length > 0) {
      transactions = [...transactions, ...imported];
      history.push(transactions);
      saveTransactions(transactions);
      renderAll();
    }
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

if (budgetAddBtn) {
  budgetAddBtn.addEventListener('click', () => {
    const category = budgetCategoryInput ? budgetCategoryInput.value.trim() : '';
    const limit = budgetLimitInput ? Number(budgetLimitInput.value) : 0;
    if (!category || !(limit > 0)) return;

    budgets = [...budgets, { category, limit }];
    saveBudgets(budgets);
    renderBudgets();
  });
}

if (budgetMonthInput) {
  budgetMonthInput.addEventListener('input', () => renderBudgets());
  budgetMonthInput.addEventListener('change', () => renderBudgets());
}

if (reportMonthInput) {
  reportMonthInput.addEventListener('input', () => renderReports());
  reportMonthInput.addEventListener('change', () => renderReports());
}

// Initial render
updateView();
