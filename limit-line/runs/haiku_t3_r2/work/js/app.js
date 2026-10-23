import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { drawBarChart } from './chart.js';

const STORAGE_KEY = 'expense-tracker:transactions';

const el = {
  form: document.getElementById('form'),
  date: document.getElementById('date'),
  description: document.getElementById('description'),
  amount: document.getElementById('amount'),
  category: document.getElementById('category'),
  list: document.getElementById('list'),
  balance: document.getElementById('balance'),
  filter: document.getElementById('filter'),
  import: document.getElementById('import'),
  export: document.getElementById('export'),
  chart: document.getElementById('chart'),
};

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.map((t) => ({ ...t, id: t.id ?? newId() }));
  } catch {
    return [];
  }
}

let transactions = load();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function categories() {
  return [...new Set(transactions.map((t) => t.category))].sort();
}

function renderFilter() {
  const previous = el.filter.value;
  el.filter.replaceChildren(new Option('All', 'All'));
  for (const category of categories()) {
    el.filter.append(new Option(category, category));
  }
  el.filter.value = [...el.filter.options].some((o) => o.value === previous)
    ? previous
    : 'All';
}

function renderList() {
  const selected = el.filter.value;
  const visible =
    selected === 'All'
      ? transactions
      : transactions.filter((t) => t.category === selected);

  const tbody = el.list.tBodies[0] ?? el.list.createTBody();
  tbody.replaceChildren();

  for (const t of visible) {
    const row = tbody.insertRow();
    row.insertCell().textContent = t.date;
    row.insertCell().textContent = t.description;
    row.insertCell().textContent = Number(t.amount).toFixed(2);
    row.insertCell().textContent = t.category;

    const actions = row.insertCell();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'delete';
    button.dataset.id = t.id;
    button.textContent = 'Delete';
    actions.append(button);
  }
}

function renderBalance() {
  el.balance.textContent = summarize(transactions).balance.toFixed(2);
}

function renderChart() {
  const expenses = {};
  for (const t of transactions) {
    if (t.amount < 0) {
      expenses[t.category] = (expenses[t.category] ?? 0) - t.amount;
    }
  }
  drawBarChart(el.chart, Object.entries(expenses));
}

function render() {
  renderFilter();
  renderList();
  renderBalance();
  renderChart();
}

function persistAndRender() {
  save();
  render();
}

el.form.addEventListener('submit', (event) => {
  event.preventDefault();

  const date = el.date.value;
  const description = el.description.value.trim();
  const category = el.category.value.trim();
  const rawAmount = el.amount.value.trim();
  const amount = Number(rawAmount);

  if (!date || !description || !category || rawAmount === '' || !Number.isFinite(amount)) {
    alert('Please fill in all fields with a valid amount.');
    return;
  }

  transactions.push({ id: newId(), date, description, amount, category });
  persistAndRender();
  el.form.reset();
  el.description.focus();
});

el.list.addEventListener('click', (event) => {
  const button = event.target.closest('button.delete');
  if (!button) return;
  transactions = transactions.filter((t) => t.id !== button.dataset.id);
  persistAndRender();
});

el.filter.addEventListener('change', renderList);

el.import.addEventListener('change', async () => {
  const file = el.import.files[0];
  if (!file) return;

  try {
    const imported = parseCSV(await file.text());
    transactions.push(...imported.map((t) => ({ ...t, id: newId() })));
    persistAndRender();
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  } finally {
    el.import.value = '';
  }
});

el.export.addEventListener('click', () => {
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

render();
