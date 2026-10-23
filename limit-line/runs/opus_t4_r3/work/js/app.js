import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const TX_KEY = 'budget-app.transactions';
const BUDGET_KEY = 'budget-app.budgets';
const VIEWS = ['transactions', 'budgets', 'reports'];

const $ = sel => document.querySelector(sel);

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
    // storage full or unavailable; keep working in memory
  }
}

let nextId = 1;
function withId(item) {
  return { id: nextId++, date: item.date, description: item.description ?? '', amount: Number(item.amount) || 0, category: item.category ?? '' };
}

const history = createHistory(load(TX_KEY).map(withId));
let budgets = load(BUDGET_KEY).filter(b => b && typeof b.category === 'string' && Number(b.limit) > 0)
  .map(b => ({ category: b.category, limit: Number(b.limit) }));
let sortByAmount = false;

const transactions = () => history.state();

function commit(newState) {
  history.push(newState);
  changed();
}

function changed() {
  save(TX_KEY, transactions().map(({ id, ...rest }) => rest));
  render();
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(month) {
  return { from: `${month}-01`, to: `${month}-31` };
}

function cell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

/* ---------- routing ---------- */

function route() {
  const name = location.hash.replace(/^#\/?/, '');
  const view = VIEWS.includes(name) ? name : 'transactions';
  for (const v of VIEWS) {
    $(`#view-${v}`).hidden = v !== view;
    $(`#nav-${v}`).classList.toggle('active', v === view);
  }
  if (view === 'reports') renderReport();
}

/* ---------- rendering ---------- */

function renderTransactions() {
  const query = $('#search').value.trim().toLowerCase();
  let rows = transactions().filter(t => String(t.description).toLowerCase().includes(query));
  rows = sortByAmount
    ? [...rows].sort((a, b) => b.amount - a.amount)
    : [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));

  const tbody = $('#list tbody');
  tbody.replaceChildren(...rows.map(t => {
    const tr = document.createElement('tr');
    tr.dataset.id = t.id;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete';
    btn.textContent = 'Delete';
    btn.dataset.id = t.id;
    const actions = document.createElement('td');
    actions.append(btn);
    tr.append(
      cell(t.date),
      cell(t.description),
      cell(t.amount.toFixed(2), 'num ' + (t.amount < 0 ? 'neg' : 'pos')),
      cell(t.category),
      actions,
    );
    return tr;
  }));

  $('#balance').textContent = summarize(transactions()).balance.toFixed(2);
  $('#undo').disabled = !history.canUndo();
  $('#redo').disabled = !history.canRedo();
}

function renderBudgets() {
  const month = $('#budget-month').value || currentMonth();
  const results = checkBudgets(transactions(), budgets, month);
  $('#budgets tbody').replaceChildren(...results.map((r, i) => {
    const tr = document.createElement('tr');
    if (r.over) tr.className = 'over';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'budget-delete';
    btn.textContent = 'Remove';
    btn.dataset.index = i;
    const actions = document.createElement('td');
    actions.append(btn);
    tr.append(cell(r.category), cell(r.limit.toFixed(2), 'num'), cell(r.spent.toFixed(2), 'num'), actions);
    return tr;
  }));
}

function renderReport() {
  const month = $('#report-month').value || currentMonth();
  const range = monthRange(month);
  const { byCategory } = summarize(transactions(), range);
  const categories = Object.keys(byCategory).sort();
  $('#report tbody').replaceChildren(...categories.map(c => {
    const tr = document.createElement('tr');
    tr.append(cell(c || '(none)'), cell(byCategory[c].toFixed(2), 'num'));
    return tr;
  }));

  const expenses = {};
  for (const t of transactions()) {
    if (t.amount < 0 && t.date >= range.from && t.date <= range.to) {
      expenses[t.category] = (expenses[t.category] || 0) - t.amount;
    }
  }
  drawChart(Object.entries(expenses).sort((a, b) => b[1] - a[1]));
}

function drawChart(data) {
  const canvas = $('#chart');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';

  if (data.length === 0) {
    ctx.fillStyle = '#7b8794';
    ctx.fillText('No expenses this month', width / 2, height / 2);
    return;
  }

  const pad = { top: 24, bottom: 36, left: 16, right: 16 };
  const plotH = height - pad.top - pad.bottom;
  const slot = (width - pad.left - pad.right) / data.length;
  const barW = Math.min(64, slot * 0.7);
  const max = Math.max(...data.map(d => d[1]));

  ctx.strokeStyle = '#cbd2d9';
  ctx.beginPath();
  ctx.moveTo(pad.left, height - pad.bottom + 0.5);
  ctx.lineTo(width - pad.right, height - pad.bottom + 0.5);
  ctx.stroke();

  data.forEach(([category, value], i) => {
    const h = max > 0 ? (value / max) * plotH : 0;
    const x = pad.left + slot * i + (slot - barW) / 2;
    const y = height - pad.bottom - h;
    ctx.fillStyle = '#3e7cb1';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#1f2933';
    ctx.fillText(value.toFixed(2), x + barW / 2, y - 6);
    ctx.fillText(category || '(none)', x + barW / 2, height - pad.bottom + 16, slot - 4);
  });
}

function render() {
  renderTransactions();
  renderBudgets();
  renderReport();
}

/* ---------- events ---------- */

$('#add').addEventListener('click', () => {
  const date = $('#date').value;
  const amount = Number($('#amount').value);
  if (!date || $('#amount').value.trim() === '' || !Number.isFinite(amount)) {
    alert('Please enter a date and an amount.');
    return;
  }
  const base = { date, description: $('#description').value, amount, category: $('#category').value.trim() };
  const repeat = $('#repeat').value;
  let items = [base];
  if (repeat === 'week' || repeat === 'month') {
    const until = $('#until').value || date;
    items = expandRecurring({ ...base, every: repeat }, until);
  }
  if (items.length === 0) return;
  commit([...transactions(), ...items.map(withId)]);
  $('#description').value = '';
  $('#amount').value = '';
});

$('#list').addEventListener('click', e => {
  const btn = e.target.closest('button.delete');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  commit(transactions().filter(t => t.id !== id));
});

$('#search').addEventListener('input', renderTransactions);

$('#sort-amount').addEventListener('click', () => {
  sortByAmount = true;
  renderTransactions();
});

$('#undo').addEventListener('click', () => {
  if (!history.canUndo()) return;
  history.undo();
  changed();
});

$('#redo').addEventListener('click', () => {
  if (!history.canRedo()) return;
  history.redo();
  changed();
});

$('#import').addEventListener('change', async e => {
  const input = e.target;
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    const items = parseCSV(await file.text()).filter(t => t.date);
    if (items.length) commit([...transactions(), ...items.map(withId)]);
  } catch (err) {
    alert('Could not import file: ' + err.message);
  } finally {
    input.value = '';
  }
});

$('#export').addEventListener('click', () => {
  const blob = new Blob([toCSV(transactions())], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$('#budget-add').addEventListener('click', () => {
  const category = $('#budget-category').value.trim();
  const limit = Number($('#budget-limit').value);
  if (!category || !(limit > 0)) {
    alert('Please enter a category and a positive limit.');
    return;
  }
  budgets = [...budgets, { category, limit }];
  save(BUDGET_KEY, budgets);
  $('#budget-category').value = '';
  $('#budget-limit').value = '';
  renderBudgets();
});

$('#budgets').addEventListener('click', e => {
  const btn = e.target.closest('button.budget-delete');
  if (!btn) return;
  const index = Number(btn.dataset.index);
  budgets = budgets.filter((_, i) => i !== index);
  save(BUDGET_KEY, budgets);
  renderBudgets();
});

$('#budget-month').addEventListener('input', renderBudgets);
$('#budget-month').addEventListener('change', renderBudgets);
$('#report-month').addEventListener('input', renderReport);
$('#report-month').addEventListener('change', renderReport);

window.addEventListener('hashchange', route);
window.addEventListener('storage', e => {
  if (e.key === BUDGET_KEY) {
    budgets = load(BUDGET_KEY);
    renderBudgets();
  }
});

/* ---------- init ---------- */

$('#budget-month').value = currentMonth();
$('#report-month').value = currentMonth();
$('#date').value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
if (!location.hash) window.history.replaceState(null, '', '#/transactions');
render();
route();
