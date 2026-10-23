import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const TRANSACTIONS_KEY = 'budget-app:transactions';
const BUDGETS_KEY = 'budget-app:budgets';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VIEWS = ['transactions', 'budgets', 'reports'];

const $ = (id) => document.getElementById(id);

function load(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const history = createHistory(load(TRANSACTIONS_KEY));
let budgets = load(BUDGETS_KEY);
let sortByAmount = false;

const transactions = () => history.state();

function saveTransactions() {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(history.state()));
}

function saveBudgets() {
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}

function commit(newList) {
  history.push(newList);
  saveTransactions();
  renderAll();
}

function showMessage(text) {
  $('message').textContent = text;
}

function money(n) {
  return n.toFixed(2);
}

function isoDate(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function currentMonth() {
  return isoDate(new Date()).slice(0, 7);
}

function monthRange(month) {
  return { from: `${month}-01`, to: `${month}-31` };
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function deleteButton(className, index) {
  const button = document.createElement('button');
  button.className = className;
  button.dataset.index = index;
  button.textContent = 'Delete';
  return button;
}

function isValidItem(item) {
  return DATE_PATTERN.test(item.date) && Number.isFinite(item.amount);
}

// Views

function showView() {
  const name = location.hash.replace(/^#\/?/, '');
  const active = VIEWS.includes(name) ? name : 'transactions';
  for (const view of VIEWS) {
    $(`view-${view}`).hidden = view !== active;
    $(`nav-${view}`).classList.toggle('active', view === active);
  }
  renderAll();
}

function renderAll() {
  renderTransactions();
  renderBudgets();
  renderReport();
}

// Transactions

function renderTransactions() {
  const list = transactions();
  const query = $('search').value.trim().toLowerCase();
  let rows = list
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.description.toLowerCase().includes(query));
  if (sortByAmount) {
    rows = rows.sort((a, b) => b.item.amount - a.item.amount);
  }

  const tbody = $('list').tBodies[0];
  tbody.replaceChildren(
    ...rows.map(({ item, index }) => {
      const tr = document.createElement('tr');
      const actions = document.createElement('td');
      actions.append(deleteButton('delete', index));
      tr.append(cell(item.date), cell(item.description), cell(money(item.amount)), cell(item.category), actions);
      return tr;
    }),
  );

  $('balance').textContent = money(summarize(list).balance);
}

function addTransactions() {
  const date = $('date').value;
  const description = $('description').value.trim();
  const amountText = $('amount').value;
  const amount = Number(amountText);
  const category = $('category').value.trim();
  const repeat = $('repeat').value;
  const until = $('until').value;

  if (!DATE_PATTERN.test(date) || !description || amountText === '' || !Number.isFinite(amount)) {
    showMessage('Enter a date, a description and an amount.');
    return;
  }

  const base = { date, description, amount, category };
  let added;
  if (repeat === 'none') {
    added = [base];
  } else {
    if (!DATE_PATTERN.test(until) || until < date) {
      showMessage('Enter an until date on or after the start date.');
      return;
    }
    added = expandRecurring({ ...base, every: repeat }, until);
  }

  commit([...transactions(), ...added]);
  showMessage(`Added ${added.length} transaction(s).`);
  $('description').value = '';
  $('amount').value = '';
}

async function importCSV(event) {
  const input = event.target;
  const file = input.files[0];
  if (!file) return;

  const items = parseCSV(await file.text()).filter(isValidItem);
  if (items.length > 0) {
    commit([...transactions(), ...items]);
  }
  showMessage(`Imported ${items.length} transaction(s).`);
  input.value = '';
}

function exportCSV() {
  const blob = new Blob([toCSV(transactions())], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Budgets

function renderBudgets() {
  const month = $('budget-month').value || currentMonth();
  const results = checkBudgets(transactions(), budgets, month);

  const tbody = $('budgets').tBodies[0];
  tbody.replaceChildren(
    ...results.map((result, index) => {
      const tr = document.createElement('tr');
      tr.classList.toggle('over', result.over);
      const actions = document.createElement('td');
      actions.append(deleteButton('delete-budget', index));
      tr.append(cell(result.category), cell(money(result.limit)), cell(money(result.spent)), actions);
      return tr;
    }),
  );
}

function addBudget() {
  const category = $('budget-category').value.trim();
  const limitText = $('budget-limit').value;
  const limit = Number(limitText);

  if (!category || limitText === '' || !Number.isFinite(limit) || limit <= 0) {
    showMessage('Enter a category and a positive limit.');
    return;
  }

  budgets = [...budgets, { category, limit }];
  saveBudgets();
  $('budget-category').value = '';
  $('budget-limit').value = '';
  renderBudgets();
}

// Reports

function expenseByCategory(list, month) {
  const totals = {};
  for (const item of list) {
    if (item.amount < 0 && item.date.slice(0, 7) === month) {
      totals[item.category] = (totals[item.category] || 0) - item.amount;
    }
  }
  return totals;
}

function renderReport() {
  const month = $('report-month').value || currentMonth();
  const list = transactions();
  const { byCategory } = summarize(list, monthRange(month));

  const tbody = $('report').tBodies[0];
  tbody.replaceChildren(
    ...Object.keys(byCategory)
      .sort()
      .map((category) => {
        const tr = document.createElement('tr');
        tr.append(cell(category), cell(money(byCategory[category])));
        return tr;
      }),
  );

  drawChart(expenseByCategory(list, month));
}

function drawChart(totals) {
  const canvas = $('chart');
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const pad = 40;

  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';

  const names = Object.keys(totals).sort();
  if (names.length === 0) {
    ctx.fillStyle = '#555';
    ctx.fillText('No expenses this month', width / 2, height / 2);
    return;
  }

  const max = Math.max(...names.map((name) => totals[name]));
  const slot = (width - pad * 2) / names.length;
  const barWidth = Math.min(60, slot * 0.6);
  const plotHeight = height - pad * 2;

  names.forEach((name, i) => {
    const value = totals[name];
    const barHeight = (value / max) * plotHeight;
    const x = pad + i * slot + (slot - barWidth) / 2;
    const y = height - pad - barHeight;

    ctx.fillStyle = '#4a7bd0';
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = '#333';
    ctx.fillText(money(value), x + barWidth / 2, y - 6);
    ctx.fillText(name, x + barWidth / 2, height - pad + 16);
  });
}

// Wiring

$('add').addEventListener('click', addTransactions);
$('search').addEventListener('input', renderTransactions);
$('sort-amount').addEventListener('click', () => {
  sortByAmount = true;
  renderTransactions();
});
$('list').addEventListener('click', (event) => {
  const button = event.target.closest('.delete');
  if (!button) return;
  const index = Number(button.dataset.index);
  commit(transactions().filter((_, i) => i !== index));
});
$('undo').addEventListener('click', () => {
  history.undo();
  saveTransactions();
  renderAll();
});
$('redo').addEventListener('click', () => {
  history.redo();
  saveTransactions();
  renderAll();
});
$('import').addEventListener('change', importCSV);
$('export').addEventListener('click', exportCSV);

$('budget-add').addEventListener('click', addBudget);
$('budget-month').addEventListener('input', renderBudgets);
$('budget-month').addEventListener('change', renderBudgets);
$('budgets').addEventListener('click', (event) => {
  const button = event.target.closest('.delete-budget');
  if (!button) return;
  const index = Number(button.dataset.index);
  budgets = budgets.filter((_, i) => i !== index);
  saveBudgets();
  renderBudgets();
});

$('report-month').addEventListener('input', renderReport);
$('report-month').addEventListener('change', renderReport);

$('date').value = isoDate(new Date());
$('budget-month').value = currentMonth();
$('report-month').value = currentMonth();

window.addEventListener('hashchange', showView);
showView();
