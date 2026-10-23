import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const $ = id => document.getElementById(id);
const ITEMS_KEY = 'budget.items';
const BUDGETS_KEY = 'budget.budgets';

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
    localStorage.setItem(ITEMS_KEY, JSON.stringify(history.state()));
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
  } catch { /* storage unavailable */ }
}

let nextId = 0;
const newId = () => `${Date.now().toString(36)}-${(nextId++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const history = createHistory(load(ITEMS_KEY));
let budgets = load(BUDGETS_KEY);
let sortDesc = false;

const thisMonth = new Date().toISOString().slice(0, 7);
$('budget-month').value = thisMonth;
$('report-month').value = thisMonth;

const money = n => n.toFixed(2);

function cell(tr, text, cls) {
  const td = document.createElement('td');
  td.textContent = text;
  if (cls) td.className = cls;
  tr.appendChild(td);
  return td;
}

function renderTransactions() {
  const items = history.state();
  $('balance').textContent = money(summarize(items).balance);
  const q = $('search').value.toLowerCase();
  let rows = items.filter(it => String(it.description).toLowerCase().includes(q));
  if (sortDesc) rows = rows.slice().sort((a, b) => b.amount - a.amount);
  const body = $('list').tBodies[0];
  body.replaceChildren();
  for (const it of rows) {
    const tr = document.createElement('tr');
    cell(tr, it.date);
    cell(tr, it.description);
    cell(tr, money(it.amount), 'num');
    cell(tr, it.category);
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete';
    btn.textContent = 'Delete';
    btn.addEventListener('click', () => {
      history.push(history.state().filter(x => x.id !== it.id));
      changed();
    });
    td.appendChild(btn);
    tr.appendChild(td);
    body.appendChild(tr);
  }
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function renderBudgets() {
  const table = $('budgets');
  table.replaceChildren();
  const results = checkBudgets(history.state(), budgets, $('budget-month').value);
  for (const r of results) {
    const tr = document.createElement('tr');
    if (r.over) tr.className = 'over';
    cell(tr, r.category);
    cell(tr, money(r.limit), 'num');
    cell(tr, money(r.spent), 'num');
    table.appendChild(tr);
  }
}

function renderReport() {
  const month = $('report-month').value;
  const inMonth = history.state().filter(it => it.date.startsWith(month));
  const { byCategory } = summarize(inMonth);
  const table = $('report');
  table.replaceChildren();
  const cats = Object.keys(byCategory);
  for (const c of cats) {
    const tr = document.createElement('tr');
    cell(tr, c);
    cell(tr, money(byCategory[c]), 'num');
    table.appendChild(tr);
  }
  drawChart(cats.filter(c => byCategory[c] < 0).map(c => [c, -byCategory[c]]));
}

function drawChart(data) {
  const canvas = $('chart');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (data.length === 0) return;
  const pad = 30;
  const max = Math.max(...data.map(d => d[1]));
  const slot = (w - pad * 2) / data.length;
  const barW = slot * 0.6;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  data.forEach(([name, value], i) => {
    const bh = (value / max) * (h - pad * 2 - 14);
    const x = pad + i * slot + (slot - barW) / 2;
    const y = h - pad - bh;
    ctx.fillStyle = '#3b7dd8';
    ctx.fillRect(x, y, barW, bh);
    ctx.fillStyle = '#222';
    ctx.fillText(money(value), x + barW / 2, y - 4);
    ctx.fillText(name, x + barW / 2, h - pad + 14);
  });
}

function renderAll() {
  renderTransactions();
  renderBudgets();
  renderReport();
}

function changed() {
  save();
  renderAll();
}

function route() {
  const name = ['transactions', 'budgets', 'reports'].find(n => location.hash === `#/${n}`) || 'transactions';
  for (const n of ['transactions', 'budgets', 'reports']) {
    $(`view-${n}`).classList.toggle('active', n === name);
    $(`nav-${n}`).classList.toggle('active', n === name);
  }
}

$('add').addEventListener('click', () => {
  const amount = parseFloat($('amount').value);
  const date = $('date').value;
  if (!date || !Number.isFinite(amount)) return;
  const rule = {
    date,
    description: $('description').value,
    amount,
    category: $('category').value,
  };
  const every = $('repeat').value;
  const until = $('until').value;
  let added = [rule];
  if ((every === 'week' || every === 'month') && until) {
    added = expandRecurring({ ...rule, every }, until);
  }
  if (added.length === 0) return;
  history.push([...history.state(), ...added.map(it => ({ ...it, id: newId() }))]);
  changed();
});

$('search').addEventListener('input', renderTransactions);
$('sort-amount').addEventListener('click', () => {
  sortDesc = true;
  renderTransactions();
});
$('undo').addEventListener('click', () => { history.undo(); changed(); });
$('redo').addEventListener('click', () => { history.redo(); changed(); });

$('import').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const parsed = parseCSV(await file.text()).filter(it => it.date && Number.isFinite(it.amount));
  e.target.value = '';
  if (parsed.length === 0) return;
  history.push([...history.state(), ...parsed.map(it => ({ ...it, id: newId() }))]);
  changed();
});

$('export').addEventListener('click', () => {
  const blob = new Blob([toCSV(history.state())], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$('budget-add').addEventListener('click', () => {
  const category = $('budget-category').value;
  const limit = parseFloat($('budget-limit').value);
  if (!category || !Number.isFinite(limit) || limit <= 0) return;
  budgets = [...budgets, { category, limit }];
  changed();
});
$('budget-month').addEventListener('input', renderBudgets);
$('budget-month').addEventListener('change', renderBudgets);
$('report-month').addEventListener('input', renderReport);
$('report-month').addEventListener('change', renderReport);

window.addEventListener('hashchange', route);
route();
renderAll();
