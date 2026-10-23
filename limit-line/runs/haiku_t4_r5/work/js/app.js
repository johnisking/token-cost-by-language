// Page logic: wires the modules to the DOM and keeps localStorage in sync.

import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const TRANSACTIONS_KEY = 'budget.transactions';
const BUDGETS_KEY = 'budget.budgets';
const VIEWS = ['transactions', 'budgets', 'reports'];

const $ = id => document.getElementById(id);

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function currentMonth() {
  return todayString().slice(0, 7);
}

// First and last day of a "YYYY-MM" month, as inclusive YYYY-MM-DD strings.
function monthRange(month) {
  const [year, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad(last)}` };
}

function isValidItem(item) {
  return /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.amount);
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function message(text, isError = false) {
  const el = $('message');
  el.textContent = text;
  el.classList.toggle('error', isError);
}

let transactions = load(TRANSACTIONS_KEY, []);
let budgets = load(BUDGETS_KEY, []);
const history = createHistory(transactions);
let searchText = '';
let sortByAmount = false;

// Replaces the transaction list, recording the change for undo/redo.
function commit(next) {
  history.push(next);
  transactions = next;
  save(TRANSACTIONS_KEY, transactions);
  renderAll();
}

function undo() {
  if (!history.canUndo()) return;
  transactions = history.undo();
  save(TRANSACTIONS_KEY, transactions);
  renderAll();
}

function redo() {
  if (!history.canRedo()) return;
  transactions = history.redo();
  save(TRANSACTIONS_KEY, transactions);
  renderAll();
}

function withId(item) {
  return { ...item, id: newId() };
}

function addTransactions() {
  const date = $('date').value;
  const description = $('description').value.trim();
  const amountText = $('amount').value.trim();
  const amount = Number(amountText);
  const category = $('category').value.trim();
  const repeat = $('repeat').value;
  const until = $('until').value || date;

  if (!date) return message('Pick a date.', true);
  if (amountText === '' || !Number.isFinite(amount)) return message('Enter an amount.', true);

  let items;
  if (repeat === 'none') {
    items = [{ date, description, amount, category }];
  } else {
    items = expandRecurring({ date, description, amount, category, every: repeat }, until);
    if (items.length === 0) return message('The until date is before the first date.', true);
  }

  commit([...transactions, ...items.map(withId)]);
  $('description').value = '';
  $('amount').value = '';
  message(`Added ${items.length} transaction${items.length === 1 ? '' : 's'}.`);
}

function deleteTransaction(id) {
  commit(transactions.filter(t => t.id !== id));
}

function renderTransactions() {
  const query = searchText.trim().toLowerCase();
  let rows = transactions.filter(t => t.description.toLowerCase().includes(query));
  if (sortByAmount) rows = [...rows].sort((a, b) => b.amount - a.amount);

  const tbody = $('list').querySelector('tbody');
  tbody.replaceChildren(...rows.map(t => {
    const tr = document.createElement('tr');
    tr.dataset.id = t.id;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete';
    remove.textContent = 'Delete';

    const action = document.createElement('td');
    action.append(remove);

    tr.append(cell(t.date), cell(t.description), cell(t.amount.toFixed(2)), cell(t.category), action);
    return tr;
  }));

  $('balance').textContent = summarize(transactions).balance.toFixed(2);
}

function exportCSV() {
  const blob = new Blob([toCSV(transactions)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importCSV(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    const items = parseCSV(await file.text()).filter(isValidItem);
    if (items.length === 0) {
      message('No valid transactions found in that file.', true);
    } else {
      commit([...transactions, ...items.map(withId)]);
      message(`Imported ${items.length} transaction${items.length === 1 ? '' : 's'}.`);
    }
  } catch {
    message('Could not read that file.', true);
  }
  input.value = '';
}

function addBudget() {
  const category = $('budget-category').value.trim();
  const limit = Number($('budget-limit').value);
  if (!category) return message('Enter a budget category.', true);
  if (!(limit > 0)) return message('Enter a limit greater than zero.', true);

  budgets = [...budgets, { category, limit }];
  save(BUDGETS_KEY, budgets);
  $('budget-category').value = '';
  $('budget-limit').value = '';
  message('Budget added.');
  renderBudgets();
}

function renderBudgets() {
  const month = $('budget-month').value || currentMonth();
  const rows = checkBudgets(transactions, budgets, month);

  $('budgets').querySelector('tbody').replaceChildren(...rows.map(r => {
    const tr = document.createElement('tr');
    if (r.over) tr.classList.add('over');
    tr.append(cell(r.category), cell(r.limit.toFixed(2)), cell(r.spent.toFixed(2)));
    return tr;
  }));
}

// Expense total per category for one month, as positive numbers.
function expensesByCategory(month) {
  const totals = {};
  for (const t of transactions) {
    if (t.date.slice(0, 7) !== month || t.amount >= 0) continue;
    totals[t.category] = (totals[t.category] || 0) - t.amount;
  }
  return Object.keys(totals).sort().map(label => ({ label, value: totals[label] }));
}

function drawChart(canvas, bars) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#374151';

  if (bars.length === 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No expenses this month', width / 2, height / 2);
    return;
  }

  const pad = { top: 24, right: 16, bottom: 56, left: 64 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...bars.map(b => b.value)) || 1;
  const baseY = pad.top + plotH;

  ctx.strokeStyle = '#9ca3af';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, baseY);
  ctx.lineTo(pad.left + plotW, baseY);
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(max.toFixed(2), pad.left - 6, pad.top);
  ctx.fillText('0', pad.left - 6, baseY);

  const slot = plotW / bars.length;
  const barW = Math.min(60, slot * 0.6);
  bars.forEach((bar, i) => {
    const x = pad.left + slot * i + (slot - barW) / 2;
    const h = (bar.value / max) * plotH;

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x, baseY - h, barW, h);

    ctx.fillStyle = '#374151';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(bar.value.toFixed(2), x + barW / 2, baseY - h - 4);

    ctx.textBaseline = 'top';
    ctx.fillText(bar.label, x + barW / 2, baseY + 6);
  });
}

function renderReport() {
  const month = $('report-month').value || currentMonth();
  const { byCategory } = summarize(transactions, monthRange(month));

  $('report').querySelector('tbody').replaceChildren(...Object.keys(byCategory).sort().map(category => {
    const tr = document.createElement('tr');
    tr.append(cell(category), cell(byCategory[category].toFixed(2)));
    return tr;
  }));

  drawChart($('chart'), expensesByCategory(month));
}

function currentView() {
  const name = location.hash.replace(/^#\//, '');
  return VIEWS.includes(name) ? name : 'transactions';
}

function renderViews() {
  const active = currentView();
  for (const name of VIEWS) {
    $(`view-${name}`).hidden = name !== active;
    $(`nav-${name}`).classList.toggle('active', name === active);
  }
}

function renderAll() {
  renderViews();
  renderTransactions();
  renderBudgets();
  renderReport();
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

function on(id, events, handler) {
  for (const event of [].concat(events)) {
    $(id).addEventListener(event, handler);
  }
}

on('add', 'click', addTransactions);
on('undo', 'click', undo);
on('redo', 'click', redo);
on('search', ['input', 'change'], e => {
  searchText = e.target.value;
  renderTransactions();
});
on('sort-amount', 'click', () => {
  sortByAmount = true;
  renderTransactions();
});
on('import', 'change', e => importCSV(e.target));
on('export', 'click', exportCSV);
$('list').querySelector('tbody').addEventListener('click', e => {
  const button = e.target.closest('button.delete');
  if (button) deleteTransaction(button.closest('tr').dataset.id);
});

on('budget-add', 'click', addBudget);
on('budget-month', ['input', 'change'], renderBudgets);
on('report-month', ['input', 'change'], renderReport);

window.addEventListener('hashchange', renderAll);

$('date').value = todayString();
$('budget-month').value = currentMonth();
$('report-month').value = currentMonth();
renderAll();
