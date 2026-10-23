import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const TX_KEY = 'budget.transactions';
const BUDGET_KEY = 'budget.budgets';
const $ = (id) => document.getElementById(id);

function load(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

const history = createHistory(load(TX_KEY));
let budgets = load(BUDGET_KEY);
let sortDesc = false;

const fmt = (n) => (Math.abs(n) < 0.005 ? 0 : n).toFixed(2);
const currentMonth = () => new Date().toISOString().slice(0, 7);

function cell(text, cls) {
  const td = document.createElement('td');
  td.textContent = text;
  if (cls) td.className = cls;
  return td;
}

function actionCell(className, label, onClick) {
  const td = document.createElement('td');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  td.append(btn);
  return td;
}

function commit(items) {
  history.push(items);
  save(TX_KEY, items);
  render();
}

// ---- views
const VIEWS = ['transactions', 'budgets', 'reports'];
function showView() {
  const m = location.hash.match(/^#\/(\w+)/);
  const active = m && VIEWS.includes(m[1]) ? m[1] : 'transactions';
  for (const v of VIEWS) {
    $('view-' + v).hidden = v !== active;
    $('nav-' + v).classList.toggle('active', v === active);
  }
}

// ---- rendering
function renderTransactions() {
  const items = history.state();
  const q = $('search').value.toLowerCase();
  let rows = items.filter((it) => String(it.description).toLowerCase().includes(q));
  if (sortDesc) rows = rows.slice().sort((a, b) => b.amount - a.amount);
  $('list-body').replaceChildren(...rows.map((it) => {
    const tr = document.createElement('tr');
    tr.append(cell(it.date), cell(it.description), cell(fmt(it.amount), 'num'), cell(it.category));
    tr.append(actionCell('delete', 'Delete', () => commit(history.state().filter((x) => x !== it))));
    return tr;
  }));
  $('balance').textContent = fmt(summarize(items).balance);
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function renderBudgets() {
  const month = $('budget-month').value;
  const results = checkBudgets(history.state(), budgets, month);
  $('budgets-body').replaceChildren(...results.map((r, i) => {
    const tr = document.createElement('tr');
    if (r.over) tr.className = 'over';
    tr.append(cell(r.category), cell(fmt(r.limit), 'num'), cell(fmt(r.spent), 'num'));
    tr.append(actionCell('delete-budget', 'Remove', () => {
      budgets = budgets.filter((_, j) => j !== i);
      save(BUDGET_KEY, budgets);
      render();
    }));
    return tr;
  }));
}

function renderReport() {
  const month = $('report-month').value;
  const items = history.state();
  const { byCategory } = summarize(items, { from: month + '-01', to: month + '-31' });
  $('report-body').replaceChildren(...Object.keys(byCategory).sort().map((cat) => {
    const tr = document.createElement('tr');
    tr.append(cell(cat), cell(fmt(byCategory[cat]), 'num'));
    return tr;
  }));
  const expenses = {};
  for (const it of items) {
    if (it.amount < 0 && it.date.slice(0, 7) === month) {
      expenses[it.category] = (expenses[it.category] ?? 0) - it.amount;
    }
  }
  drawChart(expenses);
}

function drawChart(expenses) {
  const canvas = $('chart');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cats = Object.keys(expenses).sort();
  ctx.font = '12px sans-serif';
  if (!cats.length) {
    ctx.fillStyle = '#666';
    ctx.fillText('No expenses this month', 10, 20);
    return;
  }
  const max = Math.max(...cats.map((c) => expenses[c]));
  const top = 20;
  const bottom = 24;
  const slot = w / cats.length;
  const barW = Math.min(60, slot * 0.6);
  ctx.textAlign = 'center';
  cats.forEach((c, i) => {
    const bh = max > 0 ? ((h - top - bottom) * expenses[c]) / max : 0;
    const x = i * slot + (slot - barW) / 2;
    ctx.fillStyle = '#3b82c4';
    ctx.fillRect(x, h - bottom - bh, barW, bh);
    ctx.fillStyle = '#222';
    ctx.fillText(fmt(expenses[c]), x + barW / 2, h - bottom - bh - 4);
    ctx.fillText(c, x + barW / 2, h - 8, slot - 4);
  });
  ctx.textAlign = 'start';
}

function render() {
  renderTransactions();
  renderBudgets();
  renderReport();
}

// ---- events
$('add').addEventListener('click', () => {
  const date = $('date').value;
  const amount = parseFloat($('amount').value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amount)) return;
  const base = {
    date,
    description: $('description').value,
    amount,
    category: $('category').value.trim() || 'Uncategorized',
  };
  const every = $('repeat').value;
  const until = $('until').value;
  const added = every !== 'none' && until ? expandRecurring({ ...base, every }, until) : [base];
  if (!added.length) return;
  commit([...history.state(), ...added]);
  $('description').value = '';
  $('amount').value = '';
});

$('search').addEventListener('input', renderTransactions);
$('sort-amount').addEventListener('click', () => {
  sortDesc = true;
  renderTransactions();
});
$('undo').addEventListener('click', () => {
  history.undo();
  save(TX_KEY, history.state());
  render();
});
$('redo').addEventListener('click', () => {
  history.redo();
  save(TX_KEY, history.state());
  render();
});

$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const items = parseCSV(await file.text()).filter((it) => it.date && Number.isFinite(it.amount));
  e.target.value = '';
  if (items.length) commit([...history.state(), ...items]);
});

$('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([toCSV(history.state())], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$('budget-add').addEventListener('click', () => {
  const category = $('budget-category').value.trim();
  const limit = parseFloat($('budget-limit').value);
  if (!category || !Number.isFinite(limit) || limit <= 0) return;
  budgets = [...budgets, { category, limit }];
  save(BUDGET_KEY, budgets);
  $('budget-category').value = '';
  $('budget-limit').value = '';
  render();
});

for (const id of ['budget-month', 'report-month']) {
  $(id).addEventListener('input', render);
  $(id).addEventListener('change', render);
}
window.addEventListener('hashchange', showView);

$('budget-month').value = currentMonth();
$('report-month').value = currentMonth();
showView();
render();
