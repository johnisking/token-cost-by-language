import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const TX_KEY = 'budget.transactions';
const BUDGET_KEY = 'budget.budgets';
const VIEWS = ['transactions', 'budgets', 'reports'];

const $ = id => document.getElementById(id);

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
    // storage unavailable or full; keep working in memory
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
  .filter(b => b && b.category !== undefined)
  .map(b => ({ category: String(b.category), limit: Number(b.limit) || 0 }));
let sortByAmount = false;

const transactions = () => history.state();
const plain = items => items.map(({ date, description, amount, category }) => ({ date, description, amount, category }));

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

function commit(newItems) {
  history.push(newItems);
  saveTransactions();
  render();
}

function saveTransactions() {
  save(TX_KEY, plain(transactions()));
}

// ---- rendering ----

function renderTransactions() {
  const tbody = $('list').tBodies[0];
  const query = $('search').value.trim().toLowerCase();
  let rows = transactions().filter(t => t.description.toLowerCase().includes(query));
  if (sortByAmount) rows = [...rows].sort((a, b) => b.amount - a.amount);
  $('sort-amount').classList.toggle('sorted', sortByAmount);

  tbody.replaceChildren(...rows.map(t => {
    const tr = document.createElement('tr');
    tr.dataset.id = t.id;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete';
    del.textContent = 'Delete';
    del.addEventListener('click', () => commit(transactions().filter(x => x.id !== t.id)));
    const actions = document.createElement('td');
    actions.append(del);
    tr.append(
      cell(t.date),
      cell(t.description),
      cell(t.amount.toFixed(2), 'num ' + (t.amount < 0 ? 'neg' : 'pos')),
      cell(t.category),
      actions,
    );
    return tr;
  }));

  $('balance').textContent = summarize(transactions()).balance.toFixed(2);
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function renderBudgets() {
  const month = $('budget-month').value || currentMonth();
  const tbody = $('budgets').tBodies[0];
  const results = checkBudgets(transactions(), budgets, month);
  tbody.replaceChildren(...results.map(r => {
    const tr = document.createElement('tr');
    if (r.over) tr.className = 'over';
    tr.append(cell(r.category), cell(r.limit.toFixed(2), 'num'), cell(r.spent.toFixed(2), 'num'));
    return tr;
  }));
}

function renderReport() {
  const month = $('report-month').value || currentMonth();
  const range = monthRange(month);
  const { byCategory } = summarize(transactions(), range);
  const tbody = $('report').tBodies[0];
  const categories = Object.keys(byCategory).sort();
  tbody.replaceChildren(...categories.map(c => {
    const tr = document.createElement('tr');
    tr.append(cell(c), cell(byCategory[c].toFixed(2), 'num'));
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
  const canvas = $('chart');
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px system-ui, sans-serif';
  if (!data.length) {
    ctx.fillStyle = '#7b8794';
    ctx.textAlign = 'center';
    ctx.fillText('No expenses this month', width / 2, height / 2);
    return;
  }
  const pad = { top: 20, bottom: 30, left: 10, right: 10 };
  const max = Math.max(...data.map(d => d[1]));
  const slot = (width - pad.left - pad.right) / data.length;
  const barWidth = Math.max(4, slot * 0.7);
  const plotHeight = height - pad.top - pad.bottom;
  ctx.textAlign = 'center';
  data.forEach(([category, value], i) => {
    const h = max > 0 ? (value / max) * plotHeight : 0;
    const x = pad.left + i * slot + (slot - barWidth) / 2;
    const y = pad.top + plotHeight - h;
    ctx.fillStyle = '#486581';
    ctx.fillRect(x, y, barWidth, h);
    ctx.fillStyle = '#1f2933';
    ctx.fillText(value.toFixed(2), x + barWidth / 2, y - 5);
    ctx.fillText(category || '(none)', x + barWidth / 2, height - pad.bottom + 16, slot);
  });
}

function render() {
  renderTransactions();
  renderBudgets();
  renderReport();
}

// ---- routing ----

function route() {
  const name = location.hash.replace(/^#\/?/, '');
  const active = VIEWS.includes(name) ? name : 'transactions';
  for (const v of VIEWS) {
    $(`view-${v}`).hidden = v !== active;
    $(`nav-${v}`).classList.toggle('active', v === active);
  }
  if (active === 'reports') renderReport();
  if (active === 'budgets') renderBudgets();
}

// ---- events ----

$('add').addEventListener('click', () => {
  const date = $('date').value;
  const amountText = $('amount').value;
  const amount = Number(amountText);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || amountText === '' || !Number.isFinite(amount)) return;
  const item = {
    date,
    description: $('description').value,
    amount,
    category: $('category').value,
  };
  const repeat = $('repeat').value;
  const until = $('until').value;
  const items = repeat === 'week' || repeat === 'month'
    ? expandRecurring({ ...item, every: repeat }, until || date)
    : [item];
  if (!items.length) return;
  commit([...transactions(), ...items.map(withId)]);
  $('description').value = '';
  $('amount').value = '';
});

$('search').addEventListener('input', renderTransactions);

$('sort-amount').addEventListener('click', () => {
  sortByAmount = true;
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
  const input = e.target;
  const file = input.files && input.files[0];
  if (!file) return;
  const text = await file.text();
  const items = parseCSV(text).filter(i => i.date);
  if (items.length) commit([...transactions(), ...items.map(withId)]);
  input.value = '';
});

$('export').addEventListener('click', () => {
  const blob = new Blob([toCSV(plain(transactions()))], { type: 'text/csv' });
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
  const category = $('budget-category').value.trim();
  const limit = Number($('budget-limit').value);
  if (!category || !(limit > 0)) return;
  budgets.push({ category, limit });
  save(BUDGET_KEY, budgets);
  $('budget-category').value = '';
  $('budget-limit').value = '';
  renderBudgets();
});

for (const id of ['budget-month', 'report-month']) {
  $(id).value = currentMonth();
  const handler = id === 'budget-month' ? renderBudgets : renderReport;
  $(id).addEventListener('input', handler);
  $(id).addEventListener('change', handler);
}

window.addEventListener('hashchange', route);

render();
route();
