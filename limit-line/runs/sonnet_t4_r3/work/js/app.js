import { parseCSV, toCSV } from './csv.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const TX_KEY = 'budget.transactions';
const BUDGET_KEY = 'budget.budgets';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const $ = (id) => document.getElementById(id);

function load(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(TX_KEY, JSON.stringify(history.state()));
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
  } catch {
    /* storage unavailable */
  }
}

const history = createHistory(load(TX_KEY));
let budgets = load(BUDGET_KEY);
let sortByAmount = false;

const money = (n) => (Math.abs(n) < 0.005 ? 0 : n).toFixed(2);
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function cell(text, cls) {
  const td = document.createElement('td');
  td.textContent = text;
  if (cls) td.className = cls;
  return td;
}

function button(text, cls, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

// ---- routing ----
const VIEWS = ['transactions', 'budgets', 'reports'];

function route() {
  const m = /^#\/(\w+)/.exec(location.hash);
  const active = m && VIEWS.includes(m[1]) ? m[1] : 'transactions';
  for (const v of VIEWS) {
    $('view-' + v).hidden = v !== active;
    $('nav-' + v).classList.toggle('active', v === active);
  }
  if (active === 'reports') renderReport();
}

// ---- transactions ----
function commit(items) {
  history.push(items);
  save();
  render();
}

function renderTransactions() {
  const items = history.state();
  const total = items.reduce((s, it) => s + it.amount, 0);
  $('balance').textContent = money(total);

  const q = $('search').value.toLowerCase();
  let rows = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => String(item.description).toLowerCase().includes(q));
  if (sortByAmount) rows.sort((a, b) => b.item.amount - a.item.amount);

  const tbody = $('list').tBodies[0];
  tbody.replaceChildren();
  for (const { item, index } of rows) {
    const tr = document.createElement('tr');
    tr.append(cell(item.date), cell(item.description), cell(item.category), cell(money(item.amount), 'num'));
    const td = document.createElement('td');
    td.append(
      button('Delete', 'delete', () => {
        const cur = history.state();
        commit(cur.filter((_, i) => i !== index));
      }),
    );
    tr.append(td);
    tbody.append(tr);
  }
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function addTransaction() {
  const date = $('date').value.trim();
  const amount = Number($('amount').value.trim());
  if (!DATE_RE.test(date) || $('amount').value.trim() === '' || !Number.isFinite(amount)) return;
  const rule = {
    date,
    description: $('description').value,
    amount,
    category: $('category').value.trim(),
  };
  const every = $('repeat').value;
  const until = $('until').value.trim();
  let added;
  if ((every === 'week' || every === 'month') && DATE_RE.test(until)) {
    added = expandRecurring({ ...rule, every }, until);
  } else {
    added = [rule];
  }
  if (added.length === 0) return;
  commit([...history.state(), ...added]);
  $('description').value = '';
  $('amount').value = '';
}

async function importFile(file) {
  const text = await file.text();
  const rows = parseCSV(text).filter((r) => DATE_RE.test(r.date) && Number.isFinite(r.amount));
  if (rows.length) commit([...history.state(), ...rows]);
}

function exportFile() {
  const blob = new Blob([toCSV(history.state())], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- budgets ----
function renderBudgets() {
  const result = checkBudgets(history.state(), budgets, $('budget-month').value);
  const tbody = $('budgets').tBodies[0];
  tbody.replaceChildren();
  result.forEach((b, i) => {
    const tr = document.createElement('tr');
    if (b.over) tr.classList.add('over');
    tr.append(cell(b.category), cell(money(b.limit), 'num'), cell(money(b.spent), 'num'));
    const td = document.createElement('td');
    td.append(
      button('Remove', 'delete-budget', () => {
        budgets = budgets.filter((_, j) => j !== i);
        save();
        render();
      }),
    );
    tr.append(td);
    tbody.append(tr);
  });
}

function addBudget() {
  const category = $('budget-category').value.trim();
  const limit = Number($('budget-limit').value.trim());
  if (!category || !(limit > 0) || !Number.isFinite(limit)) return;
  const existing = budgets.find((b) => b.category === category);
  if (existing) existing.limit = limit;
  else budgets.push({ category, limit });
  $('budget-category').value = '';
  $('budget-limit').value = '';
  save();
  render();
}

// ---- reports ----
function renderReport() {
  const month = $('report-month').value;
  const totals = new Map();
  const expenses = new Map();
  for (const it of history.state()) {
    if (String(it.date).slice(0, 7) !== month) continue;
    totals.set(it.category, (totals.get(it.category) || 0) + it.amount);
    if (it.amount < 0) expenses.set(it.category, (expenses.get(it.category) || 0) - it.amount);
  }
  const tbody = $('report').tBodies[0];
  tbody.replaceChildren();
  for (const [cat, total] of totals) {
    const tr = document.createElement('tr');
    tr.append(cell(cat), cell(money(total), 'num'));
    tbody.append(tr);
  }
  drawChart([...expenses]);
}

function drawChart(data) {
  const canvas = $('chart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.font = '12px system-ui, sans-serif';
  if (data.length === 0) {
    ctx.fillStyle = '#666';
    ctx.fillText('No expenses this month', 16, 24);
    return;
  }
  const left = 16;
  const bottom = H - 40;
  const top = 24;
  const max = Math.max(...data.map(([, v]) => v));
  const slot = (W - left * 2) / data.length;
  const barW = Math.min(80, slot * 0.6);
  data.forEach(([cat, value], i) => {
    const h = (value / max) * (bottom - top);
    const x = left + i * slot + (slot - barW) / 2;
    ctx.fillStyle = '#2f6db5';
    ctx.fillRect(x, bottom - h, barW, h);
    ctx.fillStyle = '#222';
    ctx.textAlign = 'center';
    ctx.fillText(money(value), x + barW / 2, bottom - h - 6);
    ctx.fillText(cat || '(none)', x + barW / 2, bottom + 16, slot - 4);
  });
  ctx.textAlign = 'start';
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(left, bottom + 0.5);
  ctx.lineTo(W - left, bottom + 0.5);
  ctx.stroke();
}

function render() {
  renderTransactions();
  renderBudgets();
  renderReport();
}

// ---- wiring ----
$('add').addEventListener('click', addTransaction);
$('search').addEventListener('input', renderTransactions);
$('sort-amount').addEventListener('click', () => {
  sortByAmount = true;
  renderTransactions();
});
$('undo').addEventListener('click', () => {
  history.undo();
  save();
  render();
});
$('redo').addEventListener('click', () => {
  history.redo();
  save();
  render();
});
$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) await importFile(file);
  e.target.value = '';
});
$('export').addEventListener('click', exportFile);
$('budget-add').addEventListener('click', addBudget);
$('budget-month').addEventListener('input', renderBudgets);
$('budget-month').addEventListener('change', renderBudgets);
$('report-month').addEventListener('input', renderReport);
$('report-month').addEventListener('change', renderReport);
window.addEventListener('hashchange', route);

$('budget-month').value = currentMonth();
$('report-month').value = currentMonth();
render();
route();
