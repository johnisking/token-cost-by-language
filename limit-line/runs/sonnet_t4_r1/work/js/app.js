import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const TX_KEY = 'budget.transactions';
const BUDGET_KEY = 'budget.budgets';

const $ = id => document.getElementById(id);

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
let sortDesc = false;

const currentMonth = new Date().toISOString().slice(0, 7);
$('budget-month').value = currentMonth;
$('report-month').value = currentMonth;

const fmt = n => Number(n).toFixed(2);

function cell(text, cls) {
  const td = document.createElement('td');
  td.textContent = text;
  if (cls) td.className = cls;
  return td;
}

function saveTransactions() {
  localStorage.setItem(TX_KEY, JSON.stringify(history.state()));
}

function saveBudgets() {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

function setTransactions(items) {
  history.push(items);
  saveTransactions();
  render();
}

function renderTransactions() {
  const items = history.state();
  $('balance').textContent = fmt(summarize(items).balance);

  const q = $('search').value.toLowerCase();
  let rows = items
    .map((item, index) => ({ item, index }))
    .filter(r => String(r.item.description).toLowerCase().includes(q));
  if (sortDesc) rows.sort((a, b) => b.item.amount - a.item.amount);

  const body = $('list');
  body.textContent = '';
  for (const { item, index } of rows) {
    const tr = document.createElement('tr');
    tr.append(
      cell(item.date),
      cell(item.description),
      cell(fmt(item.amount), item.amount < 0 ? 'neg' : ''),
      cell(item.category),
    );
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete';
    btn.textContent = 'Delete';
    btn.addEventListener('click', () => {
      setTransactions(history.state().filter((_, i) => i !== index));
    });
    td.append(btn);
    tr.append(td);
    body.append(tr);
  }
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function renderBudgets() {
  const month = $('budget-month').value;
  const results = checkBudgets(history.state(), budgets, month);
  const body = $('budgets');
  body.textContent = '';
  results.forEach((r, i) => {
    const tr = document.createElement('tr');
    if (r.over) tr.className = 'over';
    tr.append(cell(r.category), cell(fmt(r.limit)), cell(fmt(r.spent)));
    const td = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete-budget';
    btn.textContent = 'Remove';
    btn.addEventListener('click', () => {
      budgets = budgets.filter((_, j) => j !== i);
      saveBudgets();
      render();
    });
    td.append(btn);
    tr.append(td);
    body.append(tr);
  });
}

function drawChart(entries) {
  const canvas = $('chart');
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (!entries.length) return;
  const pad = { l: 40, r: 20, t: 20, b: 40 };
  const max = Math.max(...entries.map(e => e[1]));
  const slot = (width - pad.l - pad.r) / entries.length;
  const barW = Math.min(60, slot * 0.7);
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#222';
  ctx.strokeStyle = '#999';
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, height - pad.b);
  ctx.lineTo(width - pad.r, height - pad.b);
  ctx.stroke();
  entries.forEach(([name, value], i) => {
    const h = max > 0 ? (value / max) * (height - pad.t - pad.b - 16) : 0;
    const x = pad.l + slot * i + (slot - barW) / 2;
    const y = height - pad.b - h;
    ctx.fillStyle = '#2a9d8f';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#222';
    ctx.fillText(fmt(value), x + barW / 2, y - 4);
    ctx.fillText(name, x + barW / 2, height - pad.b + 16);
  });
}

function renderReports() {
  const month = $('report-month').value;
  const items = history.state();
  const range = month ? { from: `${month}-01`, to: `${month}-31` } : undefined;
  const { byCategory } = summarize(items, range);
  const body = $('report');
  body.textContent = '';
  for (const [cat, total] of Object.entries(byCategory)) {
    const tr = document.createElement('tr');
    tr.append(cell(cat), cell(fmt(total)));
    body.append(tr);
  }
  const expenses = summarize(items.filter(i => i.amount < 0), range).byCategory;
  drawChart(Object.entries(expenses).map(([c, v]) => [c, -v]));
}

function render() {
  renderTransactions();
  renderBudgets();
  renderReports();
}

function route() {
  const name = ['transactions', 'budgets', 'reports'].find(n => location.hash === `#/${n}`) || 'transactions';
  for (const n of ['transactions', 'budgets', 'reports']) {
    $(`view-${n}`).hidden = n !== name;
    $(`nav-${n}`).classList.toggle('active', n === name);
  }
  render();
}

$('add').addEventListener('click', () => {
  const date = $('date').value;
  const amount = parseFloat($('amount').value);
  if (!date || Number.isNaN(amount)) return;
  const base = {
    date,
    description: $('description').value,
    amount,
    category: $('category').value,
  };
  const every = $('repeat').value;
  const until = $('until').value;
  const added = every !== 'none' && until
    ? expandRecurring({ ...base, every }, until)
    : [base];
  if (!added.length) return;
  setTransactions([...history.state(), ...added]);
});

$('search').addEventListener('input', renderTransactions);
$('sort-amount').addEventListener('click', () => {
  sortDesc = true;
  renderTransactions();
});

$('undo').addEventListener('click', () => {
  history.undo();
  saveTransactions();
  render();
});
$('redo').addEventListener('click', () => {
  history.redo();
  saveTransactions();
  render();
});

$('import').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const rows = parseCSV(await file.text()).filter(r => r.date && !Number.isNaN(r.amount));
  e.target.value = '';
  if (rows.length) setTransactions([...history.state(), ...rows]);
});

$('export').addEventListener('click', () => {
  const blob = new Blob([toCSV(history.state())], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$('budget-add').addEventListener('click', () => {
  const category = $('budget-category').value;
  const limit = parseFloat($('budget-limit').value);
  if (!category || !(limit > 0)) return;
  budgets = [...budgets, { category, limit }];
  saveBudgets();
  render();
});

$('budget-month').addEventListener('input', renderBudgets);
$('budget-month').addEventListener('change', renderBudgets);
$('report-month').addEventListener('input', renderReports);
$('report-month').addEventListener('change', renderReports);

window.addEventListener('hashchange', route);
route();
