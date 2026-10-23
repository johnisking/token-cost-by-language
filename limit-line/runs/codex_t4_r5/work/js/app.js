import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const $ = selector => document.querySelector(selector);
const today = new Date().toISOString().slice(0, 10);
const thisMonth = today.slice(0, 7);
let transactions = readStorage('budget-transactions', []);
let budgets = readStorage('budget-budgets', []);
const history = createHistory(transactions);
let descending = false;

function readStorage(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : fallback; }
  catch { return fallback; }
}
function saveTransactions() { localStorage.setItem('budget-transactions', JSON.stringify(transactions)); }
function saveBudgets() { localStorage.setItem('budget-budgets', JSON.stringify(budgets)); }
function money(value) { return (Number(value) || 0).toFixed(2); }
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

function setTransactions(next) {
  transactions = next;
  saveTransactions();
  render();
}
function commit(next) { history.push(next); setTransactions(next); }

function renderTransactions() {
  const query = $('#search').value.trim().toLocaleLowerCase();
  const visible = transactions.map((item, index) => ({ item, index }))
    .filter(({ item }) => item.description.toLocaleLowerCase().includes(query));
  if (descending) visible.sort((a, b) => Number(b.item.amount) - Number(a.item.amount));
  $('#list').innerHTML = visible.map(({ item, index }) => `<tr><td>${escapeHTML(item.date)}</td><td>${escapeHTML(item.description)}</td><td class="category-cell">${escapeHTML(item.category)}</td><td class="amount ${Number(item.amount) >= 0 ? 'income' : 'expense'}">${Number(item.amount) > 0 ? '+' : ''}${money(item.amount)}</td><td><button class="delete" data-index="${index}" aria-label="Delete ${escapeHTML(item.description)}" title="Delete">×</button></td></tr>`).join('');
  $('#empty-transactions').style.display = visible.length ? 'none' : 'block';
  $('#balance').textContent = money(summarize(transactions).balance);
  $('#undo').disabled = !history.canUndo(); $('#redo').disabled = !history.canRedo();
}
function renderBudgets() {
  const month = $('#budget-month').value || thisMonth;
  const rows = checkBudgets(transactions, budgets, month);
  $('#budgets').innerHTML = rows.map((row, index) => `<tr class="${row.over ? 'over' : ''}"><td>${escapeHTML(row.category)}</td><td class="amount">${money(row.limit)}</td><td class="amount">${money(row.spent)}</td><td><span class="status ${row.over ? 'over-status' : ''}">${row.over ? 'Over limit' : 'On track'}</span></td><td><button class="budget-delete" data-budget-index="${index}" aria-label="Delete ${escapeHTML(row.category)} budget" title="Delete budget">×</button></td></tr>`).join('');
  $('#empty-budgets').style.display = rows.length ? 'none' : 'block';
}
function renderReport() {
  const month = $('#report-month').value || thisMonth;
  const totals = summarize(transactions, { from: `${month}-01`, to: `${month}-31` }).byCategory;
  const entries = Object.entries(totals).sort((a, b) => a[0].localeCompare(b[0]));
  $('#report').innerHTML = entries.map(([category, total]) => `<tr><td>${escapeHTML(category)}</td><td class="${total < 0 ? 'expense' : 'income'}">${money(total)}</td></tr>`).join('');
  $('#empty-report').style.display = entries.length ? 'none' : 'block';
  drawChart(totals);
}
function drawChart(totals) {
  const canvas = $('#chart'), context = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1, width = canvas.clientWidth, height = canvas.clientHeight;
  canvas.width = width * ratio; canvas.height = height * ratio;
  context.scale(ratio, ratio); context.clearRect(0, 0, width, height);
  const expenses = Object.entries(totals).filter(([, amount]) => amount < 0).map(([name, amount]) => [name, Math.abs(amount)]);
  $('#chart-empty').style.display = expenses.length ? 'none' : 'block';
  if (!expenses.length) return;
  const max = Math.max(...expenses.map(([, value]) => value)), left = 42, right = 12, top = 10, bottom = 42;
  const plotW = width - left - right, plotH = height - top - bottom, slot = plotW / expenses.length, barW = Math.min(42, slot * .56);
  context.font = '10px "DM Mono", monospace'; context.textAlign = 'right'; context.fillStyle = '#a0a69e';
  for (let i = 0; i <= 3; i++) {
    const y = top + plotH - plotH * i / 3;
    context.strokeStyle = '#eff0eb'; context.beginPath(); context.moveTo(left, y); context.lineTo(width - right, y); context.stroke();
    context.fillText((max * i / 3).toFixed(0), left - 7, y + 3);
  }
  expenses.forEach(([name, value], index) => {
    const barH = Math.max(2, plotH * value / max), x = left + slot * index + (slot - barW) / 2, y = top + plotH - barH;
    context.fillStyle = '#6f9277'; context.beginPath(); context.roundRect(x, y, barW, barH, [4, 4, 0, 0]); context.fill();
    context.fillStyle = '#7d857d'; context.textAlign = 'center';
    const label = name.length > 10 ? `${name.slice(0, 9)}…` : name;
    context.fillText(label, x + barW / 2, height - 18);
  });
}
function render() { renderTransactions(); renderBudgets(); renderReport(); }

function route() {
  const route = location.hash || '#/transactions';
  const key = route === '#/budgets' ? 'budgets' : route === '#/reports' ? 'reports' : 'transactions';
  for (const name of ['transactions', 'budgets', 'reports']) {
    $(`#view-${name}`).classList.toggle('hidden', name !== key);
    $(`#nav-${name}`).classList.toggle('active', name === key);
  }
  if (key === 'reports') renderReport();
}

$('#date').value = today;
$('#budget-month').value = thisMonth;
$('#report-month').value = thisMonth;
$('#repeat').addEventListener('change', () => {
  const recurring = $('#repeat').value !== 'none';
  $('#until-wrap').classList.toggle('hidden', !recurring);
  $('#until').required = recurring;
  if (recurring && !$('#until').value) $('#until').value = $('#date').value;
});
$('#date').addEventListener('change', () => { if ($('#repeat').value !== 'none') $('#until').value = $('#date').value; });
$('#transaction-form').addEventListener('submit', event => {
  event.preventDefault();
  const rule = { date: $('#date').value, description: $('#description').value.trim(), amount: Number($('#amount').value), category: $('#category').value.trim(), every: $('#repeat').value };
  if (!rule.date || !rule.description || !rule.category || !Number.isFinite(rule.amount)) return;
  const added = rule.every === 'none' ? [{ date: rule.date, description: rule.description, amount: rule.amount, category: rule.category }] : expandRecurring(rule, $('#until').value);
  commit([...transactions, ...added]);
  $('#description').value = ''; $('#amount').value = ''; $('#description').focus();
});
$('#list').addEventListener('click', event => {
  const button = event.target.closest('.delete');
  if (!button) return;
  commit(transactions.filter((_, index) => index !== Number(button.dataset.index)));
});
$('#search').addEventListener('input', renderTransactions);
const sort = () => { descending = !descending; renderTransactions(); };
$('#sort-amount').addEventListener('click', sort);
$('#sort-amount').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sort(); } });
$('#undo').addEventListener('click', () => setTransactions(history.undo()));
$('#redo').addEventListener('click', () => setTransactions(history.redo()));
$('#export').addEventListener('click', () => {
  const blob = new Blob([toCSV(transactions)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'transactions.csv'; link.click(); URL.revokeObjectURL(url);
});
$('#import').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try { commit([...transactions, ...parseCSV(await file.text())]); }
  catch (error) { alert(error.message || 'Could not import that CSV file.'); }
  event.target.value = '';
});
$('#budget-form').addEventListener('submit', event => {
  event.preventDefault();
  const category = $('#budget-category').value.trim(), limit = Number($('#budget-limit').value);
  if (!category || !(limit > 0)) return;
  const existing = budgets.findIndex(budget => budget.category.toLocaleLowerCase() === category.toLocaleLowerCase());
  if (existing >= 0) budgets[existing] = { category, limit };
  else budgets.push({ category, limit });
  saveBudgets(); renderBudgets(); event.target.reset();
});
$('#budgets').addEventListener('click', event => {
  const button = event.target.closest('[data-budget-index]');
  if (!button) return;
  budgets.splice(Number(button.dataset.budgetIndex), 1); saveBudgets(); renderBudgets();
});
$('#budget-month').addEventListener('change', renderBudgets);
$('#report-month').addEventListener('change', renderReport);
window.addEventListener('hashchange', route);
window.addEventListener('resize', () => { if (!$('#view-reports').classList.contains('hidden')) renderReport(); });
route(); render();
