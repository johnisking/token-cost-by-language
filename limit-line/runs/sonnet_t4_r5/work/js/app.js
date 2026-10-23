import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const TX_KEY = 'budget.transactions';
const BUDGET_KEY = 'budget.budgets';

const $ = (id) => document.getElementById(id);
const money = (n) => (Math.round(n * 100) / 100 + 0).toFixed(2);

function load(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const history = createHistory(load(TX_KEY));
let budgets = load(BUDGET_KEY);
let sortByAmount = false;

const transactions = () => history.state();

function commit(newList) {
  history.push(newList);
  render();
}

function saveAll() {
  localStorage.setItem(TX_KEY, JSON.stringify(transactions()));
  localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

// ---------- routing ----------
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

// ---------- transactions ----------
function renderTransactions() {
  const all = transactions();
  $('balance').textContent = money(all.reduce((s, t) => s + t.amount, 0));

  const q = $('search').value.toLowerCase();
  let rows = all.filter((t) => String(t.description).toLowerCase().includes(q));
  if (sortByAmount) rows = rows.slice().sort((a, b) => b.amount - a.amount);

  const body = $('list').tBodies[0];
  body.textContent = '';
  for (const t of rows) {
    const tr = document.createElement('tr');
    for (const text of [t.date, t.description, money(t.amount), t.category]) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete';
    btn.textContent = 'Delete';
    btn.addEventListener('click', () => commit(transactions().filter((x) => x !== t)));
    td.append(btn);
    tr.append(td);
    body.append(tr);
  }
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function addTransaction() {
  const date = $('date').value;
  const amount = parseFloat($('amount').value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amount)) return;
  const item = {
    date,
    description: $('description').value,
    amount,
    category: $('category').value,
  };
  const every = $('repeat').value;
  const until = $('until').value;
  let added = [item];
  if ((every === 'week' || every === 'month') && until) {
    added = expandRecurring({ ...item, every }, until);
    if (added.length === 0) added = [item];
  }
  commit(transactions().concat(added));
  $('description').value = '';
  $('amount').value = '';
}

async function importFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const rows = parseCSV(await file.text()).filter(
    (r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(r.amount),
  );
  e.target.value = '';
  if (rows.length) commit(transactions().concat(rows));
}

function exportFile() {
  const blob = new Blob([toCSV(transactions())], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- budgets ----------
function renderBudgets() {
  const month = $('budget-month').value;
  const results = checkBudgets(transactions(), budgets, month);
  const body = $('budgets').tBodies[0];
  body.textContent = '';
  results.forEach((r, i) => {
    const tr = document.createElement('tr');
    if (r.over) tr.className = 'over';
    for (const text of [r.category, money(r.limit), money(r.spent)]) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete-budget';
    btn.textContent = 'Remove';
    btn.addEventListener('click', () => {
      budgets = budgets.filter((_, n) => n !== i);
      render();
    });
    td.append(btn);
    tr.append(td);
    body.append(tr);
  });
}

function addBudget() {
  const category = $('budget-category').value;
  const limit = parseFloat($('budget-limit').value);
  if (!category || !Number.isFinite(limit) || limit <= 0) return;
  budgets = budgets.concat({ category, limit });
  $('budget-category').value = '';
  $('budget-limit').value = '';
  render();
}

// ---------- reports ----------
function renderReport() {
  const month = $('report-month').value;
  const body = $('report').tBodies[0];
  body.textContent = '';
  const inMonth = transactions().filter((t) => t.date.slice(0, 7) === month);
  const { byCategory } = summarize(inMonth);
  for (const [cat, total] of Object.entries(byCategory)) {
    const tr = document.createElement('tr');
    for (const text of [cat, money(total)]) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    body.append(tr);
  }
  const spend = {};
  for (const t of inMonth) if (t.amount < 0) spend[t.category] = (spend[t.category] || 0) - t.amount;
  drawChart(Object.entries(spend));
}

function drawChart(entries) {
  const canvas = $('chart');
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  if (entries.length === 0) return;
  const pad = { l: 16, r: 16, t: 24, b: 36 };
  const max = Math.max(...entries.map(([, v]) => v));
  const slot = (w - pad.l - pad.r) / entries.length;
  const barW = Math.min(slot * 0.6, 80);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  entries.forEach(([cat, v], i) => {
    const bh = (v / max) * (h - pad.t - pad.b);
    const x = pad.l + slot * i + (slot - barW) / 2;
    const y = h - pad.b - bh;
    ctx.fillStyle = '#3b6ea5';
    ctx.fillRect(x, y, barW, bh);
    ctx.fillStyle = '#222';
    ctx.fillText(money(v), x + barW / 2, y - 6);
    ctx.fillText(cat, x + barW / 2, h - pad.b + 16, slot);
  });
}

// ---------- wiring ----------
function render() {
  saveAll();
  renderTransactions();
  renderBudgets();
  renderReport();
}

function init() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  $('budget-month').value = month;
  $('report-month').value = month;

  $('add').addEventListener('click', addTransaction);
  $('search').addEventListener('input', renderTransactions);
  $('sort-amount').addEventListener('click', () => {
    sortByAmount = true;
    renderTransactions();
  });
  $('undo').addEventListener('click', () => {
    history.undo();
    render();
  });
  $('redo').addEventListener('click', () => {
    history.redo();
    render();
  });
  $('import').addEventListener('change', importFile);
  $('export').addEventListener('click', exportFile);
  $('budget-add').addEventListener('click', addBudget);
  $('budget-month').addEventListener('input', renderBudgets);
  $('budget-month').addEventListener('change', renderBudgets);
  $('report-month').addEventListener('input', renderReport);
  $('report-month').addEventListener('change', renderReport);
  window.addEventListener('hashchange', route);

  render();
  route();
}

init();
