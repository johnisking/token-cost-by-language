import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';
import { drawBarChart } from './chart.js';

const TRANSACTIONS_KEY = 'budget.transactions';
const BUDGETS_KEY = 'budget.budgets';
const VIEWS = ['transactions', 'budgets', 'reports'];

const $ = id => document.getElementById(id);

const history = createHistory(load(TRANSACTIONS_KEY, []));
let budgets = load(BUDGETS_KEY, []);
let sortByAmount = false;

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function today() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cell(content) {
  const td = document.createElement('td');
  td.append(content);
  return td;
}

function isValidItem(item) {
  return /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.amount);
}

// Transactions

function addTransactions(items) {
  history.push([...history.state(), ...items.map(item => ({ id: newId(), ...item }))]);
  transactionsChanged();
}

function deleteTransaction(id) {
  history.push(history.state().filter(t => t.id !== id));
  transactionsChanged();
}

function transactionsChanged() {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(history.state()));
  render();
}

function addFromForm() {
  const date = $('date').value;
  const amountText = $('amount').value.trim();
  const amount = Number(amountText);
  const every = $('repeat').value;
  const until = $('until').value;

  if (!date || amountText === '' || !Number.isFinite(amount)) {
    $('message').textContent = 'Enter a date and an amount.';
    return;
  }
  if (every !== 'none' && !until) {
    $('message').textContent = 'Enter an until date for a repeating transaction.';
    return;
  }

  const item = {
    date,
    description: $('description').value.trim(),
    amount,
    category: $('category').value.trim(),
  };
  const items = every === 'none' ? [item] : expandRecurring({ ...item, every }, until);
  if (items.length === 0) {
    $('message').textContent = 'The until date is before the date.';
    return;
  }

  $('message').textContent = '';
  $('description').value = '';
  $('amount').value = '';
  addTransactions(items);
}

async function importFile(event) {
  const input = event.target;
  const file = input.files[0];
  if (!file) return;
  const items = parseCSV(await file.text()).filter(isValidItem);
  input.value = '';
  addTransactions(items);
}

function exportCSV() {
  const url = URL.createObjectURL(new Blob([toCSV(history.state())], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function transactionRow(t) {
  const row = document.createElement('tr');
  row.dataset.id = t.id;
  const remove = document.createElement('button');
  remove.className = 'delete';
  remove.textContent = 'Delete';
  row.append(cell(t.date), cell(t.description), cell(t.amount.toFixed(2)), cell(t.category), cell(remove));
  return row;
}

function renderTransactions() {
  const search = $('search').value.toLowerCase();
  let rows = history.state().filter(t => t.description.toLowerCase().includes(search));
  if (sortByAmount) rows.sort((a, b) => b.amount - a.amount);

  $('list').tBodies[0].replaceChildren(...rows.map(transactionRow));
  $('balance').textContent = summarize(history.state()).balance.toFixed(2);
  $('undo').disabled = !history.canUndo();
  $('redo').disabled = !history.canRedo();
}

// Budgets

function saveBudgets() {
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}

function addBudget() {
  const category = $('budget-category').value.trim();
  const limit = Number($('budget-limit').value);
  if (!category || !(limit > 0)) return;

  budgets = [...budgets, { category, limit }];
  saveBudgets();
  $('budget-category').value = '';
  $('budget-limit').value = '';
  renderBudgets();
}

function renderBudgets() {
  const rows = checkBudgets(history.state(), budgets, $('budget-month').value);

  $('budgets').tBodies[0].replaceChildren(...rows.map((b, index) => {
    const row = document.createElement('tr');
    row.classList.toggle('over', b.over);
    const remove = document.createElement('button');
    remove.className = 'delete-budget';
    remove.dataset.index = index;
    remove.textContent = 'Remove';
    row.append(cell(b.category), cell(b.limit.toFixed(2)), cell(b.spent.toFixed(2)), cell(remove));
    return row;
  }));
}

// Reports

function monthRange(month) {
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

function renderReports() {
  const month = $('report-month').value;
  const valid = /^\d{4}-\d{2}$/.test(month);
  const { byCategory } = valid
    ? summarize(history.state(), monthRange(month))
    : { byCategory: {} };

  $('report').tBodies[0].replaceChildren(...Object.entries(byCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, total]) => {
      const row = document.createElement('tr');
      row.append(cell(category), cell(total.toFixed(2)));
      return row;
    }));

  const expenses = {};
  if (valid) {
    for (const t of history.state()) {
      if (t.amount < 0 && t.date.startsWith(month)) {
        expenses[t.category] = (expenses[t.category] ?? 0) - t.amount;
      }
    }
  }
  const bars = Object.entries(expenses)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
  drawBarChart($('chart'), bars);
}

// Views

function showView() {
  const name = location.hash.replace('#/', '');
  const active = VIEWS.includes(name) ? name : 'transactions';
  for (const view of VIEWS) {
    $(`view-${view}`).hidden = view !== active;
    $(`nav-${view}`).classList.toggle('active', view === active);
  }
}

function render() {
  renderTransactions();
  renderBudgets();
  renderReports();
}

// Wiring

$('add').addEventListener('click', addFromForm);
$('sort-amount').addEventListener('click', () => {
  sortByAmount = true;
  renderTransactions();
});
$('undo').addEventListener('click', () => {
  history.undo();
  transactionsChanged();
});
$('redo').addEventListener('click', () => {
  history.redo();
  transactionsChanged();
});
$('import').addEventListener('change', importFile);
$('export').addEventListener('click', exportCSV);
$('list').addEventListener('click', event => {
  const button = event.target.closest('.delete');
  if (button) deleteTransaction(button.closest('tr').dataset.id);
});

$('budget-add').addEventListener('click', addBudget);
$('budgets').addEventListener('click', event => {
  const button = event.target.closest('.delete-budget');
  if (!button) return;
  const index = Number(button.dataset.index);
  budgets = budgets.filter((_, i) => i !== index);
  saveBudgets();
  renderBudgets();
});

for (const [id, handler] of [
  ['search', renderTransactions],
  ['budget-month', renderBudgets],
  ['report-month', renderReports],
]) {
  $(id).addEventListener('input', handler);
  $(id).addEventListener('change', handler);
}

window.addEventListener('hashchange', showView);

$('date').value = today();
$('budget-month').value = today().slice(0, 7);
$('report-month').value = today().slice(0, 7);
showView();
render();
