// Page controller: wires the DOM to the data modules.
import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring, formatDate } from './recurring.js';
import { checkBudgets, monthExpenses } from './budget.js';
import { createHistory } from './history.js';
import { loadTransactions, saveTransactions, loadBudgets, saveBudgets } from './storage.js';

const $ = (sel) => document.querySelector(sel);

const history = createHistory(loadTransactions());
let budgets = loadBudgets();
let sortByAmount = false;

const transactions = () => history.state();

function commit(next) {
  history.push(next);
  saveTransactions(next);
  renderAll();
}

function money(n) {
  return (Number(n) || 0).toFixed(2);
}

function cell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function today() {
  const d = new Date();
  return formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function monthRange(month) {
  return { from: `${month}-01`, to: `${month}-31` };
}

// ---------- Routing ----------

const VIEWS = ['transactions', 'budgets', 'reports'];

function currentView() {
  const name = location.hash.replace(/^#\/?/, '');
  return VIEWS.includes(name) ? name : 'transactions';
}

function route() {
  const active = currentView();
  for (const name of VIEWS) {
    $(`#view-${name}`).hidden = name !== active;
    $(`#nav-${name}`).classList.toggle('active', name === active);
  }
  if (active === 'reports') renderReport();
  if (active === 'budgets') renderBudgets();
}

// ---------- Transactions ----------

function renderBalance() {
  $('#balance').textContent = money(summarize(transactions()).balance);
}

function renderList() {
  const query = $('#search').value.trim().toLowerCase();
  let rows = transactions().map((item, index) => ({ item, index }));
  if (query) rows = rows.filter(({ item }) => String(item.description).toLowerCase().includes(query));
  if (sortByAmount) rows.sort((a, b) => b.item.amount - a.item.amount);
  $('#sort-amount').classList.toggle('sorted', sortByAmount);

  const tbody = $('#list tbody');
  tbody.replaceChildren();
  for (const { item, index } of rows) {
    const tr = document.createElement('tr');
    tr.dataset.index = index;
    tr.append(
      cell(item.date),
      cell(item.description),
      cell(money(item.amount), 'num ' + (item.amount < 0 ? 'neg' : 'pos')),
      cell(item.category),
    );
    const td = document.createElement('td');
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete';
    del.textContent = 'Delete';
    del.dataset.index = index;
    td.append(del);
    tr.append(td);
    tbody.append(tr);
  }
  $('#undo').disabled = !history.canUndo();
  $('#redo').disabled = !history.canRedo();
}

function addTransaction(event) {
  event.preventDefault();
  const date = $('#date').value;
  const amount = Number($('#amount').value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || $('#amount').value.trim() === '' || !Number.isFinite(amount)) {
    alert('Please enter a valid date and amount.');
    return;
  }
  const base = {
    date,
    description: $('#description').value.trim(),
    amount,
    category: $('#category').value.trim() || 'Uncategorized',
  };
  const repeat = $('#repeat').value;
  const until = $('#until').value;
  let added = [base];
  if (repeat === 'week' || repeat === 'month') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) {
      alert('Please choose an "until" date for repeating transactions.');
      return;
    }
    added = expandRecurring({ ...base, every: repeat }, until);
    if (added.length === 0) {
      alert('The "until" date is before the start date.');
      return;
    }
  }
  commit([...transactions(), ...added]);
  $('#description').value = '';
  $('#amount').value = '';
}

function deleteTransaction(event) {
  const btn = event.target.closest('button.delete');
  if (!btn) return;
  const index = Number(btn.dataset.index);
  commit(transactions().filter((_, i) => i !== index));
}

async function importCSV() {
  const file = $('#import').files[0];
  if (!file) return;
  try {
    const items = parseCSV(await file.text()).filter(
      (it) => /^\d{4}-\d{2}-\d{2}$/.test(it.date) && Number.isFinite(it.amount),
    );
    if (items.length) commit([...transactions(), ...items]);
  } catch (err) {
    alert('Could not import file: ' + err.message);
  } finally {
    $('#import').value = '';
  }
}

function exportCSV() {
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

function undo() {
  if (!history.canUndo()) return;
  saveTransactions(history.undo());
  renderAll();
}

function redo() {
  if (!history.canRedo()) return;
  saveTransactions(history.redo());
  renderAll();
}

// ---------- Budgets ----------

function renderBudgets() {
  const month = $('#budget-month').value || today().slice(0, 7);
  const tbody = $('#budgets tbody');
  tbody.replaceChildren();
  checkBudgets(transactions(), budgets, month).forEach((b, index) => {
    const tr = document.createElement('tr');
    if (b.over) tr.className = 'over';
    tr.append(cell(b.category), cell(money(b.limit), 'num'), cell(money(b.spent), 'num'));
    const td = document.createElement('td');
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'budget-delete';
    del.textContent = 'Remove';
    del.dataset.index = index;
    td.append(del);
    tr.append(td);
    tbody.append(tr);
  });
}

function addBudget(event) {
  event.preventDefault();
  const category = $('#budget-category').value.trim();
  const limit = Number($('#budget-limit').value);
  if (!category || !(limit > 0)) {
    alert('Please enter a category and a positive limit.');
    return;
  }
  const existing = budgets.findIndex((b) => b.category === category);
  if (existing >= 0) budgets = budgets.map((b, i) => (i === existing ? { category, limit } : b));
  else budgets = [...budgets, { category, limit }];
  saveBudgets(budgets);
  $('#budget-category').value = '';
  $('#budget-limit').value = '';
  renderBudgets();
}

function deleteBudget(event) {
  const btn = event.target.closest('button.budget-delete');
  if (!btn) return;
  const index = Number(btn.dataset.index);
  budgets = budgets.filter((_, i) => i !== index);
  saveBudgets(budgets);
  renderBudgets();
}

// ---------- Reports ----------

function renderReport() {
  const month = $('#report-month').value || today().slice(0, 7);
  const { byCategory } = summarize(transactions(), monthRange(month));
  const tbody = $('#report tbody');
  tbody.replaceChildren();
  const categories = Object.keys(byCategory).sort((a, b) => a.localeCompare(b));
  for (const category of categories) {
    const tr = document.createElement('tr');
    tr.append(cell(category), cell(money(byCategory[category]), 'num'));
    tbody.append(tr);
  }
  drawChart(monthExpenses(transactions(), month));
}

function drawChart(expenses) {
  const canvas = $('#chart');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const entries = Object.entries(expenses).sort((a, b) => b[1] - a[1]);
  ctx.font = '12px system-ui, sans-serif';
  if (entries.length === 0) {
    ctx.fillStyle = '#829ab1';
    ctx.textAlign = 'center';
    ctx.fillText('No expenses this month', W / 2, H / 2);
    return;
  }

  const pad = { top: 24, right: 16, bottom: 40, left: 16 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const max = Math.max(...entries.map(([, v]) => v)) || 1;
  const slot = plotW / entries.length;
  const barW = Math.max(4, Math.min(80, slot * 0.6));

  ctx.strokeStyle = '#bcccdc';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + plotH + 0.5);
  ctx.lineTo(W - pad.right, pad.top + plotH + 0.5);
  ctx.stroke();

  entries.forEach(([category, value], i) => {
    const h = (value / max) * plotH;
    const x = pad.left + slot * i + (slot - barW) / 2;
    const y = pad.top + plotH - h;
    ctx.fillStyle = '#2680c2';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#1f2933';
    ctx.textAlign = 'center';
    ctx.fillText(money(value), x + barW / 2, y - 6);
    ctx.fillStyle = '#52606d';
    const label = category.length > 14 ? category.slice(0, 13) + '…' : category;
    ctx.fillText(label, x + barW / 2, pad.top + plotH + 18);
  });
}

// ---------- Init ----------

function renderAll() {
  renderBalance();
  renderList();
  if (currentView() === 'budgets') renderBudgets();
  if (currentView() === 'reports') renderReport();
}

function init() {
  const now = today();
  $('#date').value = now;
  $('#budget-month').value = now.slice(0, 7);
  $('#report-month').value = now.slice(0, 7);

  $('#add-form').addEventListener('submit', addTransaction);
  $('#list').addEventListener('click', deleteTransaction);
  $('#search').addEventListener('input', renderList);
  $('#sort-amount').addEventListener('click', () => {
    sortByAmount = true;
    renderList();
  });
  $('#undo').addEventListener('click', undo);
  $('#redo').addEventListener('click', redo);
  $('#import').addEventListener('change', importCSV);
  $('#export').addEventListener('click', exportCSV);

  $('#budget-form').addEventListener('submit', addBudget);
  $('#budgets').addEventListener('click', deleteBudget);
  $('#budget-month').addEventListener('input', renderBudgets);
  $('#budget-month').addEventListener('change', renderBudgets);
  $('#report-month').addEventListener('input', renderReport);
  $('#report-month').addEventListener('change', renderReport);

  window.addEventListener('hashchange', route);

  renderAll();
  route();
}

init();
