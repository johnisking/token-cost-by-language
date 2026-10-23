// Page logic: views, transactions, budgets and reports.
import { parseCSV, toCSV } from './csv.js';
import { summarize, monthRange } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const TRANSACTIONS_KEY = 'budget.transactions';
const BUDGETS_KEY = 'budget.budgets';
const VIEWS = ['transactions', 'budgets', 'reports'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const $ = (id) => document.getElementById(id);

function load(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function withId(item) {
  return { ...item, id: newId() };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function currentMonth() {
  return todayISO().slice(0, 7);
}

// Transactions are the undoable state; budgets are saved separately.
const history = createHistory(load(TRANSACTIONS_KEY));
let budgets = load(BUDGETS_KEY);
let sortByAmount = false;

function transactions() {
  return history.state();
}

function commitTransactions(next) {
  history.push(next);
  save(TRANSACTIONS_KEY, next);
  renderAll();
}

// ---------- views ----------

function showView() {
  const requested = location.hash.replace(/^#\//, '');
  const active = VIEWS.includes(requested) ? requested : 'transactions';

  for (const view of VIEWS) {
    $(`view-${view}`).hidden = view !== active;
    const link = $(`nav-${view}`);
    link.classList.toggle('active', view === active);
    if (view === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

// ---------- transactions ----------

function renderTransactions() {
  const query = $('search').value.trim().toLowerCase();
  let rows = transactions().filter((t) => t.description.toLowerCase().includes(query));
  if (sortByAmount) rows = [...rows].sort((a, b) => b.amount - a.amount);

  const body = $('list').tBodies[0];
  body.replaceChildren(...rows.map(renderTransactionRow));

  $('balance').textContent = summarize(transactions()).balance.toFixed(2);
}

function renderTransactionRow(item) {
  const tr = document.createElement('tr');
  tr.dataset.id = item.id;

  const cells = [item.date, item.description, item.amount.toFixed(2), item.category];
  for (const text of cells) {
    const td = document.createElement('td');
    td.textContent = text;
    tr.append(td);
  }

  const actions = document.createElement('td');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'delete';
  button.textContent = 'Delete';
  actions.append(button);
  tr.append(actions);
  return tr;
}

function showStatus(id, message) {
  $(id).textContent = message;
}

function addTransaction() {
  const date = $('date').value;
  const description = $('description').value.trim();
  const amountText = $('amount').value.trim();
  const amount = Number(amountText);
  const category = $('category').value.trim();
  const repeat = $('repeat').value;
  const until = $('until').value;

  if (!DATE_PATTERN.test(date)) return showStatus('status', 'Enter a date.');
  if (amountText === '' || !Number.isFinite(amount)) return showStatus('status', 'Enter an amount.');

  const base = { date, description, amount, category };
  let items;
  if (repeat === 'none') {
    items = [base];
  } else {
    if (!DATE_PATTERN.test(until) || until < date) {
      return showStatus('status', 'Enter an end date on or after the start date.');
    }
    items = expandRecurring({ ...base, every: repeat }, until);
  }

  commitTransactions([...transactions(), ...items.map(withId)]);
  showStatus('status', items.length > 1 ? `Added ${items.length} transactions.` : '');
  $('description').value = '';
  $('amount').value = '';
}

function deleteTransaction(id) {
  commitTransactions(transactions().filter((t) => t.id !== id));
}

async function importCSV(file) {
  const imported = parseCSV(await file.text());
  const valid = imported.filter((t) => DATE_PATTERN.test(t.date) && Number.isFinite(t.amount));
  commitTransactions([...transactions(), ...valid.map(withId)]);
  const skipped = imported.length - valid.length;
  showStatus('status', `Imported ${valid.length} rows` + (skipped ? `, skipped ${skipped}.` : '.'));
}

function exportCSV() {
  const blob = new Blob([toCSV(transactions())], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function updateHistoryButtons() {
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function undo() {
  save(TRANSACTIONS_KEY, history.undo());
  renderAll();
}

function redo() {
  save(TRANSACTIONS_KEY, history.redo());
  renderAll();
}

// ---------- budgets ----------

function renderBudgets() {
  const month = $('budget-month').value || currentMonth();
  const results = checkBudgets(transactions(), budgets, month);

  const rows = results.map((result, i) => {
    const tr = document.createElement('tr');
    if (result.over) tr.classList.add('over');
    tr.dataset.id = budgets[i].id;

    const cells = [result.category, result.limit.toFixed(2), result.spent.toFixed(2)];
    for (const text of cells) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }

    const actions = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'remove-budget';
    button.textContent = 'Remove';
    actions.append(button);
    tr.append(actions);
    return tr;
  });

  $('budgets').tBodies[0].replaceChildren(...rows);
}

function addBudget() {
  const category = $('budget-category').value.trim();
  const limit = Number($('budget-limit').value);

  if (!category) return showStatus('budget-status', 'Enter a category.');
  if (!(limit > 0)) return showStatus('budget-status', 'Enter a limit greater than zero.');

  budgets = [...budgets, { id: newId(), category, limit }];
  save(BUDGETS_KEY, budgets);
  $('budget-category').value = '';
  $('budget-limit').value = '';
  showStatus('budget-status', '');
  renderBudgets();
}

function removeBudget(id) {
  budgets = budgets.filter((b) => b.id !== id);
  save(BUDGETS_KEY, budgets);
  renderBudgets();
}

// ---------- reports ----------

function renderReports() {
  const month = $('report-month').value || currentMonth();
  const range = monthRange(month);
  const inMonth = transactions().filter((t) => t.date >= range.from && t.date <= range.to);
  const { byCategory } = summarize(inMonth);

  const categories = Object.keys(byCategory).sort();
  const rows = categories.map((category) => {
    const tr = document.createElement('tr');
    const name = document.createElement('td');
    name.textContent = category;
    const total = document.createElement('td');
    total.textContent = byCategory[category].toFixed(2);
    tr.append(name, total);
    return tr;
  });
  $('report').tBodies[0].replaceChildren(...rows);

  const expenses = new Map();
  for (const item of inMonth) {
    if (item.amount < 0) {
      expenses.set(item.category, (expenses.get(item.category) ?? 0) - item.amount);
    }
  }
  drawChart([...expenses].sort((a, b) => a[0].localeCompare(b[0])));
}

function drawChart(entries) {
  const canvas = $('chart');
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';

  if (entries.length === 0) {
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('No expenses this month.', 10, 20);
    return;
  }

  const margin = 40;
  const max = Math.max(...entries.map(([, value]) => value));
  const slot = (width - margin * 2) / entries.length;
  const scale = (height - margin * 2) / max;

  entries.forEach(([category, value], i) => {
    const barHeight = value * scale;
    const x = margin + i * slot + slot * 0.15;
    const y = height - margin - barHeight;
    const barWidth = slot * 0.7;

    ctx.fillStyle = '#4a7bd0';
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = '#222';
    ctx.fillText(value.toFixed(2), x + barWidth / 2, y - 6, slot);
    ctx.fillText(category, x + barWidth / 2, height - margin + 16, slot);
  });
}

// ---------- wiring ----------

function renderAll() {
  renderTransactions();
  renderBudgets();
  renderReports();
  updateHistoryButtons();
}

function init() {
  $('date').value = todayISO();
  $('budget-month').value = currentMonth();
  $('report-month').value = currentMonth();

  $('add').addEventListener('click', addTransaction);
  $('search').addEventListener('input', renderTransactions);
  $('sort-amount').addEventListener('click', () => {
    sortByAmount = true;
    renderTransactions();
  });
  $('list').tBodies[0].addEventListener('click', (event) => {
    const button = event.target.closest('.delete');
    if (button) deleteTransaction(button.closest('tr').dataset.id);
  });
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('import').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) await importCSV(file);
    event.target.value = '';
  });
  $('export').addEventListener('click', exportCSV);

  $('budget-add').addEventListener('click', addBudget);
  $('budget-month').addEventListener('input', renderBudgets);
  $('budgets').tBodies[0].addEventListener('click', (event) => {
    const button = event.target.closest('.remove-budget');
    if (button) removeBudget(button.closest('tr').dataset.id);
  });

  $('report-month').addEventListener('input', renderReports);

  window.addEventListener('hashchange', showView);
  showView();
  renderAll();
}

init();
