import { parseCSV, toCSV } from './csv.js';
import { summarize, expensesByCategory } from './summary.js';
import { loadTransactions, saveTransactions } from './storage.js';
import { drawChart } from './chart.js';

const ALL = 'All';

const $ = (sel) => document.querySelector(sel);
const form = $('#form');
const dateInput = $('#date');
const descInput = $('#description');
const amountInput = $('#amount');
const categoryInput = $('#category');
const list = $('#list');
const listBody = list.tBodies[0] || list;
const balanceEl = $('#balance');
const incomeEl = $('#income');
const expenseEl = $('#expense');
const filterSelect = $('#filter');
const importInput = $('#import');
const exportButton = $('#export');
const chart = $('#chart');
const categoryList = $('#category-options');
const message = $('#message');

let transactions = loadTransactions();

function categories() {
  return [...new Set(transactions.map((t) => t.category))].sort((a, b) => a.localeCompare(b));
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

function renderFilter() {
  const current = filterSelect.value || ALL;
  const cats = categories();
  filterSelect.replaceChildren(
    new Option(ALL, ALL),
    ...cats.map((c) => new Option(c || '(none)', c)),
  );
  filterSelect.value = current === ALL || cats.includes(current) ? current : ALL;
  categoryList.replaceChildren(...cats.map((c) => new Option(c)));
}

function renderList() {
  const filter = filterSelect.value;
  const rows = [];

  transactions.forEach((t, index) => {
    if (filter && filter !== ALL && t.category !== filter) return;

    const tr = document.createElement('tr');
    tr.dataset.index = String(index);
    tr.dataset.category = t.category;

    const cells = [t.date, t.description, t.amount.toFixed(2), t.category];
    cells.forEach((value, i) => {
      const td = document.createElement('td');
      td.textContent = value;
      if (i === 2) td.className = 'num ' + (t.amount < 0 ? 'neg' : 'pos');
      tr.appendChild(td);
    });

    const td = document.createElement('td');
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete';
    del.textContent = 'Delete';
    del.setAttribute('aria-label', `Delete ${t.description || 'transaction'}`);
    td.appendChild(del);
    tr.appendChild(td);

    rows.push(tr);
  });

  listBody.replaceChildren(...rows);
  $('#empty').hidden = rows.length > 0;
}

function renderSummary() {
  const { income, expense, balance } = summarize(transactions);
  balanceEl.textContent = balance.toFixed(2);
  balanceEl.classList.toggle('neg', balance < 0);
  incomeEl.textContent = income.toFixed(2);
  expenseEl.textContent = expense.toFixed(2);
}

function renderChart() {
  drawChart(chart, expensesByCategory(transactions));
}

function render() {
  renderFilter();
  renderList();
  renderSummary();
  renderChart();
}

function update() {
  saveTransactions(transactions);
  render();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const amount = Number(amountInput.value);
  if (amountInput.value.trim() === '' || !Number.isFinite(amount)) {
    showMessage('Please enter a valid amount.', true);
    amountInput.focus();
    return;
  }

  transactions.push({
    date: dateInput.value || new Date().toISOString().slice(0, 10),
    description: descInput.value.trim(),
    amount,
    category: categoryInput.value.trim() || 'Uncategorized',
  });
  update();
  showMessage('');

  descInput.value = '';
  amountInput.value = '';
  descInput.focus();
});

list.addEventListener('click', (event) => {
  const button = event.target.closest('button.delete');
  if (!button) return;
  const index = Number(button.closest('tr').dataset.index);
  if (!Number.isInteger(index)) return;
  transactions.splice(index, 1);
  update();
});

filterSelect.addEventListener('change', renderList);

importInput.addEventListener('change', async () => {
  const file = importInput.files && importInput.files[0];
  if (!file) return;
  try {
    const parsed = parseCSV(await file.text());
    const valid = parsed.filter((t) => Number.isFinite(t.amount));
    transactions.push(...valid);
    update();
    const skipped = parsed.length - valid.length;
    showMessage(
      `Imported ${valid.length} transaction${valid.length === 1 ? '' : 's'}` +
        (skipped ? ` (skipped ${skipped} invalid row${skipped === 1 ? '' : 's'}).` : '.'),
    );
  } catch (err) {
    showMessage('Could not read the CSV file.', true);
    console.error(err);
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
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

window.addEventListener('resize', renderChart);

dateInput.value = new Date().toISOString().slice(0, 10);
render();
