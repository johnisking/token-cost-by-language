import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const TRANSACTIONS_KEY = 'budget.transactions';
const BUDGETS_KEY = 'budget.budgets';
const VIEWS = ['transactions', 'budgets', 'reports'];

const $ = (id) => document.getElementById(id);

function loadArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const history = createHistory(loadArray(TRANSACTIONS_KEY));
let budgets = loadArray(BUDGETS_KEY);
let sortByAmount = false;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const pad = (n) => String(n).padStart(2, '0');
const monthOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
const todayOf = (date) => `${monthOf(date)}-${pad(date.getDate())}`;

function saveTransactions() {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(history.state()));
}

function saveBudgets() {
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}

// Every change to the transactions goes through here so it is saved and redrawn.
function changeTransactions(next) {
  history.push(next);
  saveTransactions();
  renderAll();
}

function showView() {
  const name = location.hash.replace(/^#\/?/, '');
  const active = VIEWS.includes(name) ? name : 'transactions';
  for (const view of VIEWS) {
    $(`view-${view}`).hidden = view !== active;
    $(`nav-${view}`).classList.toggle('active', view === active);
  }
}

// ---- Transactions ----

function renderTransactionRow(transaction) {
  const tr = document.createElement('tr');
  const cells = [
    transaction.date,
    transaction.description,
    Number(transaction.amount).toFixed(2),
    transaction.category,
  ];
  for (const text of cells) {
    const td = document.createElement('td');
    td.textContent = text;
    tr.append(td);
  }

  const actions = document.createElement('td');
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'delete';
  remove.textContent = 'Delete';
  remove.addEventListener('click', () => {
    changeTransactions(history.state().filter((t) => t.id !== transaction.id));
  });
  actions.append(remove);
  tr.append(actions);
  return tr;
}

function renderTransactions() {
  const all = history.state();
  const text = $('search').value.toLowerCase();
  let rows = all.filter((t) => t.description.toLowerCase().includes(text));
  if (sortByAmount) rows = [...rows].sort((a, b) => b.amount - a.amount);

  $('list').querySelector('tbody').replaceChildren(...rows.map(renderTransactionRow));
  $('balance').textContent = summarize(all).balance.toFixed(2);
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function addTransactions(items) {
  if (items.length === 0) return;
  changeTransactions([...history.state(), ...items.map((item) => ({ id: newId(), ...item }))]);
}

$('add').addEventListener('click', () => {
  const date = $('date').value;
  const rawAmount = $('amount').value;
  if (!date || rawAmount === '') return;

  const amount = Number(rawAmount);
  if (!Number.isFinite(amount)) return;

  const base = {
    date,
    description: $('description').value.trim(),
    amount,
    category: $('category').value.trim(),
  };
  const repeat = $('repeat').value;
  const until = $('until').value;
  const occurrences =
    repeat === 'none' || !until ? [base] : expandRecurring({ ...base, every: repeat }, until);

  addTransactions(occurrences);
  $('description').value = '';
  $('amount').value = '';
});

$('search').addEventListener('input', renderTransactions);
$('search').addEventListener('change', renderTransactions);

$('sort-amount').addEventListener('click', () => {
  sortByAmount = true;
  renderTransactions();
});

$('undo').addEventListener('click', () => {
  history.undo();
  saveTransactions();
  renderAll();
});

$('redo').addEventListener('click', () => {
  history.redo();
  saveTransactions();
  renderAll();
});

$('import').addEventListener('change', async (event) => {
  const input = event.target;
  const file = input.files[0];
  input.value = '';
  if (!file) return;

  try {
    addTransactions(parseCSV(await file.text()));
  } catch (error) {
    alert(`Could not import ${file.name}: ${error.message}`);
  }
});

$('export').addEventListener('click', () => {
  const blob = new Blob([toCSV(history.state())], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ---- Budgets ----

function renderBudgets() {
  const month = $('budget-month').value;
  const rows = checkBudgets(history.state(), budgets, month).map(({ category, limit, spent, over }) => {
    const tr = document.createElement('tr');
    if (over) tr.className = 'over';
    const cells = [category, limit.toFixed(2), spent.toFixed(2)];
    for (const text of cells) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    return tr;
  });
  $('budgets').querySelector('tbody').replaceChildren(...rows);
}

$('budget-add').addEventListener('click', () => {
  const category = $('budget-category').value.trim();
  const rawLimit = $('budget-limit').value;
  const limit = Number(rawLimit);
  if (!category || rawLimit === '' || !(limit > 0)) return;

  budgets = [...budgets, { category, limit }];
  saveBudgets();
  $('budget-category').value = '';
  $('budget-limit').value = '';
  renderBudgets();
});

for (const type of ['input', 'change']) {
  $('budget-month').addEventListener(type, renderBudgets);
  $('report-month').addEventListener(type, renderReport);
}

// ---- Reports ----

function renderReport() {
  const month = $('report-month').value;
  const tbody = $('report').querySelector('tbody');
  if (!month) {
    tbody.replaceChildren();
    drawChart([]);
    return;
  }

  const range = { from: `${month}-01`, to: `${month}-31` };
  const { byCategory } = summarize(history.state(), range);
  const rows = Object.keys(byCategory)
    .sort()
    .map((category) => {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = category;
      const total = document.createElement('td');
      total.className = 'num';
      total.textContent = byCategory[category].toFixed(2);
      tr.append(name, total);
      return tr;
    });
  tbody.replaceChildren(...rows);

  // One bar per expense category: the total of the expenses (as a positive number).
  const expenses = {};
  for (const t of history.state()) {
    if (t.date >= range.from && t.date <= range.to && t.amount < 0) {
      expenses[t.category] = (expenses[t.category] ?? 0) - t.amount;
    }
  }
  drawChart(Object.keys(expenses).sort().map((category) => ({ category, value: expenses[category] })));
}

function drawChart(bars) {
  const canvas = $('chart');
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';

  if (bars.length === 0) {
    ctx.fillStyle = '#666';
    ctx.fillText('No expenses this month', width / 2, height / 2);
    return;
  }

  const top = 24;
  const bottomLabels = 28;
  const side = 20;
  const plotHeight = height - top - bottomLabels;
  const slot = (width - side * 2) / bars.length;
  const barWidth = Math.min(60, slot * 0.6);
  const max = Math.max(...bars.map((bar) => bar.value));
  const baseline = height - bottomLabels;

  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(side, baseline);
  ctx.lineTo(width - side, baseline);
  ctx.stroke();

  bars.forEach((bar, i) => {
    const barHeight = max > 0 ? (bar.value / max) * plotHeight : 0;
    const x = side + i * slot + (slot - barWidth) / 2;
    const y = baseline - barHeight;

    ctx.fillStyle = '#4a7bd0';
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#222';
    ctx.fillText(bar.value.toFixed(2), x + barWidth / 2, y - 6);
    ctx.fillText(bar.category, x + barWidth / 2, height - 10);
  });
}

// ---- Shared ----

function renderAll() {
  renderTransactions();
  renderBudgets();
  renderReport();
}

window.addEventListener('hashchange', showView);

function init() {
  const now = new Date();
  $('date').value ||= todayOf(now);
  $('budget-month').value ||= monthOf(now);
  $('report-month').value ||= monthOf(now);
  showView();
  renderAll();
}

init();
