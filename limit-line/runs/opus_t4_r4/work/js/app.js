import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const TX_KEY = 'budget-app.transactions';
const BUDGET_KEY = 'budget-app.budgets';
const VIEWS = ['transactions', 'budgets', 'reports'];

const $ = id => document.getElementById(id);

function load(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

let nextId = 1;
const withId = it => ({ ...it, id: nextId++ });

const history = createHistory(load(TX_KEY).map(withId));
let budgets = load(BUDGET_KEY);
let sortByAmount = false;

const transactions = () => history.state();
const plain = ({ date, description, amount, category }) => ({ date, description, amount, category });

function commit(newList) {
  history.push(newList);
  persistAndRender();
}

function persistAndRender() {
  save(TX_KEY, transactions().map(plain));
  save(BUDGET_KEY, budgets);
  render();
}

const fmt = n => (Number(n) || 0).toFixed(2);
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthRange = m => ({ from: `${m}-01`, to: `${m}-31` });

function cell(tr, text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  tr.appendChild(td);
  return td;
}

function tbodyOf(table) {
  let tbody = table.tBodies[0];
  if (!tbody) { tbody = document.createElement('tbody'); table.appendChild(tbody); }
  tbody.replaceChildren();
  return tbody;
}

/* ---------- Routing ---------- */

function currentView() {
  const name = location.hash.replace(/^#\/?/, '');
  return VIEWS.includes(name) ? name : 'transactions';
}

function route() {
  const active = currentView();
  for (const v of VIEWS) {
    $(`view-${v}`).hidden = v !== active;
    $(`nav-${v}`).classList.toggle('active', v === active);
  }
  render();
}

/* ---------- Rendering ---------- */

function renderTransactions() {
  const q = $('search').value.trim().toLowerCase();
  let rows = transactions().filter(t => String(t.description).toLowerCase().includes(q));
  if (sortByAmount) rows = [...rows].sort((a, b) => b.amount - a.amount);

  const tbody = tbodyOf($('list'));
  for (const t of rows) {
    const tr = document.createElement('tr');
    tr.dataset.id = t.id;
    cell(tr, t.date);
    cell(tr, t.description);
    cell(tr, fmt(t.amount), t.amount < 0 ? 'neg' : 'pos');
    cell(tr, t.category);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete';
    btn.textContent = 'Delete';
    btn.addEventListener('click', () => commit(transactions().filter(x => x.id !== t.id)));
    cell(tr, '').appendChild(btn);
    tbody.appendChild(tr);
  }

  $('balance').textContent = fmt(summarize(transactions()).balance);
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function renderBudgets() {
  const month = $('budget-month').value || currentMonth();
  const tbody = tbodyOf($('budgets'));
  checkBudgets(transactions(), budgets, month).forEach((b, i) => {
    const tr = document.createElement('tr');
    if (b.over) tr.className = 'over';
    cell(tr, b.category);
    cell(tr, fmt(b.limit));
    cell(tr, fmt(b.spent));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'remove';
    btn.textContent = 'Remove';
    btn.addEventListener('click', () => {
      budgets = budgets.filter((_, j) => j !== i);
      persistAndRender();
    });
    cell(tr, '').appendChild(btn);
    tbody.appendChild(tr);
  });
}

function renderReports() {
  const month = $('report-month').value || currentMonth();
  const { byCategory } = summarize(transactions(), monthRange(month));
  const tbody = tbodyOf($('report'));
  const categories = Object.keys(byCategory).sort((a, b) => a.localeCompare(b));
  for (const c of categories) {
    const tr = document.createElement('tr');
    cell(tr, c);
    cell(tr, fmt(byCategory[c]), byCategory[c] < 0 ? 'neg' : 'pos');
    tbody.appendChild(tr);
  }

  // Expense per category (positive numbers) for the chart.
  const expenses = {};
  for (const t of transactions()) {
    if (t.amount < 0 && t.date.slice(0, 7) === month) {
      expenses[t.category] = (expenses[t.category] || 0) - t.amount;
    }
  }
  drawChart($('chart'), Object.entries(expenses).sort((a, b) => b[1] - a[1]));
}

function drawChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  canvas.dataset.bars = String(data.length);
  ctx.clearRect(0, 0, W, H);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  if (data.length === 0) {
    ctx.fillStyle = '#829ab1';
    ctx.fillText('No expenses this month', W / 2, H / 2);
    return;
  }
  const pad = { top: 24, bottom: 36, left: 16, right: 16 };
  const max = Math.max(...data.map(d => d[1]));
  const slot = (W - pad.left - pad.right) / data.length;
  const barW = Math.min(64, slot * 0.7);
  const plotH = H - pad.top - pad.bottom;

  ctx.strokeStyle = '#bcccdc';
  ctx.beginPath();
  ctx.moveTo(pad.left, H - pad.bottom + 0.5);
  ctx.lineTo(W - pad.right, H - pad.bottom + 0.5);
  ctx.stroke();

  data.forEach(([category, value], i) => {
    const h = max > 0 ? (value / max) * plotH : 0;
    const x = pad.left + slot * i + (slot - barW) / 2;
    const y = H - pad.bottom - h;
    ctx.fillStyle = '#d64545';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#1f2933';
    ctx.fillText(fmt(value), x + barW / 2, y - 6);
    const label = category.length > 14 ? category.slice(0, 13) + '…' : category;
    ctx.fillText(label || '(none)', x + barW / 2, H - pad.bottom + 16);
  });
}

function render() {
  renderTransactions();
  renderBudgets();
  renderReports();
}

/* ---------- Actions ---------- */

function addTransaction() {
  const date = $('date').value;
  const amount = Number($('amount').value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || $('amount').value.trim() === '' || !Number.isFinite(amount)) {
    alert('Please enter a valid date and amount.');
    return;
  }
  const item = {
    date,
    description: $('description').value.trim(),
    amount,
    category: $('category').value.trim(),
  };
  const every = $('repeat').value;
  const until = $('until').value;
  let items = [item];
  if ((every === 'week' || every === 'month') && until) {
    items = expandRecurring({ ...item, every }, until);
  }
  if (items.length === 0) return;
  commit([...transactions(), ...items.map(withId)]);
  $('description').value = '';
  $('amount').value = '';
}

async function importCSV(file) {
  const text = await file.text();
  const items = parseCSV(text).filter(it => it.date);
  if (items.length) commit([...transactions(), ...items.map(withId)]);
}

function exportCSV() {
  const blob = new Blob([toCSV(transactions().map(plain))], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function addBudget() {
  const category = $('budget-category').value.trim();
  const limit = Number($('budget-limit').value);
  if (!category || !(limit > 0)) {
    alert('Please enter a category and a positive limit.');
    return;
  }
  budgets = [...budgets, { category, limit }];
  $('budget-category').value = '';
  $('budget-limit').value = '';
  persistAndRender();
}

/* ---------- Wiring ---------- */

$('budget-month').value = currentMonth();
$('report-month').value = currentMonth();

$('add').addEventListener('click', addTransaction);
$('search').addEventListener('input', renderTransactions);
$('sort-amount').addEventListener('click', () => { sortByAmount = true; renderTransactions(); });
$('undo').addEventListener('click', () => { history.undo(); persistAndRender(); });
$('redo').addEventListener('click', () => { history.redo(); persistAndRender(); });
$('import').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  if (file) await importCSV(file);
  e.target.value = '';
});
$('export').addEventListener('click', exportCSV);
$('budget-add').addEventListener('click', addBudget);
for (const id of ['budget-month', 'report-month']) {
  $(id).addEventListener('input', render);
  $(id).addEventListener('change', render);
}
window.addEventListener('hashchange', route);

route();
