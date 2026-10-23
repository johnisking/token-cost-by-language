import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { loadTransactions, saveTransactions } from './store.js';
import { drawExpenseChart } from './chart.js';

const form = document.getElementById('transaction-form');
const dateInput = document.getElementById('date');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const list = document.getElementById('list');
const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('income');
const expenseEl = document.getElementById('expense');
const categorySuggestions = document.getElementById('category-suggestions');
const filterSelect = document.getElementById('filter');
const importInput = document.getElementById('import');
const exportButton = document.getElementById('export');
const chart = document.getElementById('chart');

const ALL = 'All';
let transactions = loadTransactions();
let filterCategory = ALL;

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Give every transaction an id and a category so rows can be deleted and filtered.
function normalize(item) {
  return {
    id: item.id ?? newId(),
    date: item.date,
    description: item.description,
    amount: Number(item.amount),
    category: item.category || 'Uncategorized',
  };
}

function save() {
  saveTransactions(transactions);
  render();
}

function renderSummary() {
  const summary = summarize(transactions);
  balanceEl.textContent = summary.balance.toFixed(2);
  incomeEl.textContent = summary.income.toFixed(2);
  expenseEl.textContent = summary.expense.toFixed(2);
}

function renderFilter() {
  const categories = [...new Set(transactions.map(item => item.category))].sort();
  if (filterCategory !== ALL && !categories.includes(filterCategory)) {
    filterCategory = ALL;
  }

  const makeOption = name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    return option;
  };
  filterSelect.replaceChildren(...[ALL, ...categories].map(makeOption));
  filterSelect.value = filterCategory;
  categorySuggestions.replaceChildren(...categories.map(makeOption));
}

function renderRows() {
  const visible = filterCategory === ALL
    ? transactions
    : transactions.filter(item => item.category === filterCategory);

  const rows = visible.map(item => {
    const tr = document.createElement('tr');

    const cells = [item.date, item.description, item.amount.toFixed(2), item.category];
    for (const [index, value] of cells.entries()) {
      const td = document.createElement('td');
      td.textContent = value;
      if (index === 2) {
        td.className = item.amount < 0 ? 'negative' : 'positive';
      }
      tr.append(td);
    }

    const actionCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete';
    deleteButton.dataset.id = item.id;
    deleteButton.textContent = 'Delete';
    actionCell.append(deleteButton);
    tr.append(actionCell);

    return tr;
  });

  list.tBodies[0].replaceChildren(...rows);
}

function render() {
  renderSummary();
  renderFilter();
  renderRows();
  drawExpenseChart(chart, transactions);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const amount = Number(amountInput.value);
  if (!Number.isFinite(amount)) return;

  transactions.push({
    id: newId(),
    date: dateInput.value,
    description: descriptionInput.value.trim(),
    amount,
    category: categoryInput.value.trim() || 'Uncategorized',
  });
  save();

  form.reset();
  descriptionInput.focus();
});

list.addEventListener('click', event => {
  const button = event.target.closest('.delete');
  if (!button) return;
  transactions = transactions.filter(item => item.id !== button.dataset.id);
  save();
});

filterSelect.addEventListener('change', () => {
  filterCategory = filterSelect.value;
  renderRows();
});

importInput.addEventListener('change', async () => {
  const file = importInput.files[0];
  if (!file) return;

  try {
    const imported = parseCSV(await file.text());
    transactions = [...transactions, ...imported.map(normalize)];
    save();
  } catch (error) {
    alert(`Import failed: ${error.message}`);
  } finally {
    importInput.value = '';
  }
});

exportButton.addEventListener('click', () => {
  const blob = new Blob([toCSV(transactions)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
});

window.addEventListener('resize', () => drawExpenseChart(chart, transactions));

transactions = transactions.map(normalize);
render();
