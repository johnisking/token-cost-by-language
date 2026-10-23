import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { loadItems, saveItems } from './storage.js';
import { drawExpenseChart } from './chart.js';

const $ = (id) => document.getElementById(id);

const els = {
  form: $('transaction-form'),
  date: $('date'),
  description: $('description'),
  amount: $('amount'),
  category: $('category'),
  categoryOptions: $('category-options'),
  rows: $('rows'),
  empty: $('empty'),
  filter: $('filter'),
  balance: $('balance'),
  income: $('income'),
  expense: $('expense'),
  import: $('import'),
  export: $('export'),
  chart: $('chart'),
  status: $('status'),
};

let items = loadItems();

function setStatus(message) {
  els.status.textContent = message;
}

function persist() {
  saveItems(items);
  render();
}

function render() {
  const summary = summarize(items);
  els.balance.textContent = summary.balance.toFixed(2);
  els.income.textContent = summary.income.toFixed(2);
  els.expense.textContent = summary.expense.toFixed(2);

  renderFilter();
  renderList();
  drawExpenseChart(els.chart, items);
}

function renderFilter() {
  const categories = [...new Set(items.map((item) => item.category))].sort();
  const selected = categories.includes(els.filter.value) ? els.filter.value : 'All';

  const options = ['All', ...categories].map((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    return option;
  });
  els.filter.replaceChildren(...options);
  els.filter.value = selected;

  els.categoryOptions.replaceChildren(
    ...categories.map((category) => {
      const option = document.createElement('option');
      option.value = category;
      return option;
    }),
  );
}

function buildRow(item, index) {
  const tr = document.createElement('tr');

  const cells = [item.date, item.description, item.amount.toFixed(2), item.category];
  cells.forEach((text, i) => {
    const td = document.createElement('td');
    td.textContent = text;
    if (i === 2) {
      td.className = `amount ${item.amount < 0 ? 'negative' : 'positive'}`;
    }
    tr.append(td);
  });

  const actions = document.createElement('td');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'delete';
  button.textContent = 'Delete';
  button.dataset.index = index;
  actions.append(button);
  tr.append(actions);

  return tr;
}

function renderList() {
  const filter = els.filter.value;
  const visible = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => filter === 'All' || item.category === filter);

  els.rows.replaceChildren(...visible.map(({ item, index }) => buildRow(item, index)));
  els.empty.hidden = items.length > 0;
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault();

  const amountText = els.amount.value.trim();
  const amount = Number(amountText);
  if (amountText === '' || !Number.isFinite(amount)) {
    setStatus('Enter a valid amount.');
    return;
  }

  items.push({
    date: els.date.value,
    description: els.description.value.trim(),
    amount,
    category: els.category.value.trim(),
  });

  els.form.reset();
  els.date.value = today();
  setStatus('Transaction added.');
  persist();
});

els.rows.addEventListener('click', (event) => {
  const button = event.target.closest('button.delete');
  if (!button) return;

  items.splice(Number(button.dataset.index), 1);
  setStatus('Transaction deleted.');
  persist();
});

els.filter.addEventListener('change', renderList);

els.import.addEventListener('change', async () => {
  const file = els.import.files[0];
  if (!file) return;

  const imported = parseCSV(await file.text());
  items = [...items, ...imported];
  els.import.value = '';
  setStatus(`Imported ${imported.length} transactions.`);
  persist();
});

els.export.addEventListener('click', () => {
  const blob = new Blob([toCSV(items)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
});

window.addEventListener('resize', () => drawExpenseChart(els.chart, items));

function today() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

els.date.value = today();
render();
