import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const TX_KEY = 'budget-app.transactions';
const BUDGET_KEY = 'budget-app.budgets';
const VIEWS = ['transactions', 'budgets', 'reports'];

const $ = (sel) => document.querySelector(sel);

function load(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable or full */
  }
}

let nextId = 1;
function withId(item) {
  return {
    id: nextId++,
    date: String(item.date || ''),
    description: String(item.description ?? ''),
    amount: Number(item.amount) || 0,
    category: String(item.category ?? ''),
  };
}

const history = createHistory(load(TX_KEY).map(withId));
let budgets = load(BUDGET_KEY)
  .filter((b) => b && b.category != null && Number(b.limit) > 0)
  .map((b) => ({ category: String(b.category), limit: Number(b.limit) }));
let sortByAmount = false;

const transactions = () => history.state();
const plain = ({ date, description, amount, category }) => ({ date, description, amount, category });

function commit(newList) {
  history.push(newList);
  save(TX_KEY, newList.map(plain));
  render();
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const monthRange = (month) => ({ from: `${month}-01`, to: `${month}-31` });
const fmt = (n) => (Number(n) || 0).toFixed(2);

function cell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

/* ---------- Routing ---------- */

function route() {
  const name = (location.hash.match(/^#\/(\w+)/) || [])[1];
  const active = VIEWS.includes(name) ? name : 'transactions';
  for (const view of VIEWS) {
    $(`#view-${view}`).hidden = view !== active;
    $(`#nav-${view}`).classList.toggle('active', view === active);
  }
  render();
}

/* ---------- Rendering ---------- */

function renderTransactions() {
  const query = $('#search').value.trim().toLowerCase();
  let rows = transactions().filter((t) => t.description.toLowerCase().includes(query));
  if (sortByAmount) rows = [...rows].sort((a, b) => b.amount - a.amount);

  const tbody = $('#list tbody');
  tbody.replaceChildren(
    ...rows.map((t) => {
      const tr = document.createElement('tr');
      tr.dataset.id = t.id;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'delete';
      del.textContent = 'Delete';
      del.dataset.id = t.id;
      const action = document.createElement('td');
      action.append(del);
      tr.append(
        cell(t.date),
        cell(t.description),
        cell(t.category),
        cell(fmt(t.amount), `num ${t.amount < 0 ? 'neg' : 'pos'}`),
        action,
      );
      return tr;
    }),
  );

  $('#balance').textContent = fmt(summarize(transactions()).balance);
  $('#undo').disabled = !history.canUndo();
  $('#redo').disabled = !history.canRedo();
  $('#sort-amount').textContent = sortByAmount ? 'Amount ▼' : 'Amount';
}

function renderBudgets() {
  const monthInput = $('#budget-month');
  if (!monthInput.value) monthInput.value = currentMonth();
  const results = checkBudgets(transactions(), budgets, monthInput.value);

  $('#budgets tbody').replaceChildren(
    ...results.map((r, i) => {
      const tr = document.createElement('tr');
      if (r.over) tr.className = 'over';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'budget-delete';
      del.textContent = 'Remove';
      del.dataset.index = i;
      const action = document.createElement('td');
      action.append(del);
      tr.append(cell(r.category), cell(fmt(r.limit), 'num'), cell(fmt(r.spent), 'num'), action);
      return tr;
    }),
  );
}

function renderReports() {
  const monthInput = $('#report-month');
  if (!monthInput.value) monthInput.value = currentMonth();
  const { byCategory } = summarize(transactions(), monthRange(monthInput.value));
  const categories = Object.keys(byCategory).sort((a, b) => a.localeCompare(b));

  $('#report tbody').replaceChildren(
    ...categories.map((c) => {
      const tr = document.createElement('tr');
      tr.append(cell(c || '(none)'), cell(fmt(byCategory[c]), 'num'));
      return tr;
    }),
  );

  // Expense per category: sum of negative amounts as positive numbers.
  const expenses = {};
  for (const t of transactions()) {
    if (t.amount < 0 && t.date.slice(0, 7) === monthInput.value) {
      expenses[t.category] = (expenses[t.category] || 0) - t.amount;
    }
  }
  drawChart(Object.entries(expenses).sort((a, b) => b[1] - a[1]));
}

function drawChart(data) {
  const canvas = $('#chart');
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';

  if (data.length === 0) {
    ctx.fillStyle = '#6b7785';
    ctx.fillText('No expenses this month', width / 2, height / 2);
    return;
  }

  const top = 24;
  const bottom = 32;
  const side = 16;
  const max = Math.max(...data.map(([, v]) => v));
  const slot = (width - side * 2) / data.length;
  const barWidth = Math.min(64, slot * 0.7);
  const plotHeight = height - top - bottom;

  ctx.strokeStyle = '#c7d0da';
  ctx.beginPath();
  ctx.moveTo(side, height - bottom + 0.5);
  ctx.lineTo(width - side, height - bottom + 0.5);
  ctx.stroke();

  data.forEach(([category, value], i) => {
    const h = max > 0 ? (value / max) * plotHeight : 0;
    const x = side + slot * i + (slot - barWidth) / 2;
    const y = height - bottom - h;
    ctx.fillStyle = '#2f6fb3';
    ctx.fillRect(x, y, barWidth, h);
    ctx.fillStyle = '#1f2933';
    ctx.fillText(fmt(value), x + barWidth / 2, y - 6);
    ctx.fillText(category || '(none)', x + barWidth / 2, height - bottom + 16, slot - 4);
  });
}

function render() {
  renderTransactions();
  renderBudgets();
  renderReports();
}

/* ---------- Events ---------- */

function addTransactions() {
  const date = $('#date').value;
  const amount = Number($('#amount').value);
  if (!date || $('#amount').value === '' || Number.isNaN(amount)) {
    alert('Please enter a date and an amount.');
    return;
  }
  const base = {
    date,
    description: $('#description').value.trim(),
    amount,
    category: $('#category').value.trim(),
  };
  const repeat = $('#repeat').value;
  const until = $('#until').value;
  let items = [base];
  if (repeat === 'week' || repeat === 'month') {
    if (!until) {
      alert('Please choose an "until" date for repeating transactions.');
      return;
    }
    items = expandRecurring({ ...base, every: repeat }, until);
    if (items.length === 0) return;
  }
  commit([...transactions(), ...items.map(withId)]);
  $('#description').value = '';
  $('#amount').value = '';
}

function exportCSV() {
  const blob = new Blob([toCSV(transactions().map(plain))], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importCSV(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const items = parseCSV(String(reader.result)).filter((t) => t.date);
    if (items.length) commit([...transactions(), ...items.map(withId)]);
    input.value = '';
  };
  reader.readAsText(file);
}

function addBudget() {
  const category = $('#budget-category').value.trim();
  const limit = Number($('#budget-limit').value);
  if (!category || !(limit > 0)) {
    alert('Please enter a category and a positive limit.');
    return;
  }
  const existing = budgets.findIndex((b) => b.category === category);
  if (existing >= 0) budgets = budgets.map((b, i) => (i === existing ? { category, limit } : b));
  else budgets = [...budgets, { category, limit }];
  save(BUDGET_KEY, budgets);
  $('#budget-category').value = '';
  $('#budget-limit').value = '';
  render();
}

$('#add').addEventListener('click', addTransactions);
$('#list').addEventListener('click', (e) => {
  const btn = e.target.closest('button.delete');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  commit(transactions().filter((t) => t.id !== id));
});
$('#search').addEventListener('input', renderTransactions);
$('#sort-amount').addEventListener('click', () => {
  sortByAmount = true;
  renderTransactions();
});
$('#undo').addEventListener('click', () => {
  history.undo();
  save(TX_KEY, transactions().map(plain));
  render();
});
$('#redo').addEventListener('click', () => {
  history.redo();
  save(TX_KEY, transactions().map(plain));
  render();
});
$('#import').addEventListener('change', importCSV);
$('#export').addEventListener('click', exportCSV);

$('#budget-add').addEventListener('click', addBudget);
$('#budgets').addEventListener('click', (e) => {
  const btn = e.target.closest('button.budget-delete');
  if (!btn) return;
  const index = Number(btn.dataset.index);
  budgets = budgets.filter((_, i) => i !== index);
  save(BUDGET_KEY, budgets);
  renderBudgets();
});
for (const ev of ['input', 'change']) {
  $('#budget-month').addEventListener(ev, renderBudgets);
  $('#report-month').addEventListener(ev, renderReports);
}

window.addEventListener('hashchange', route);
route();
