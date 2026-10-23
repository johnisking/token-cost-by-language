import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const $ = selector => document.querySelector(selector);
const today = new Date().toISOString().slice(0, 10);
const thisMonth = today.slice(0, 7);
const load = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : fallback; } catch { return fallback; } };
const transactions = load('pocket-budget-transactions', []);
const budgets = load('pocket-budget-budgets', []);
const history = createHistory(transactions);
let search = '', sortAmount = false;

$('#date').value = today;
$('#budget-month').value = thisMonth;
$('#report-month').value = thisMonth;
if (!location.hash) location.hash = '#/transactions';

function save() {
  localStorage.setItem('pocket-budget-transactions', JSON.stringify(transactions));
  localStorage.setItem('pocket-budget-budgets', JSON.stringify(budgets));
}
function money(value) { return Number(value || 0).toFixed(2); }
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function renderTransactions() {
  const visible = transactions.map((item, index) => ({ ...item, index })).filter(item => item.description.toLowerCase().includes(search.toLowerCase()));
  if (sortAmount) visible.sort((a, b) => Number(b.amount) - Number(a.amount));
  $('#balance').textContent = money(summarize(transactions).balance);
  $('#transaction-count').textContent = `${transactions.length} ${transactions.length === 1 ? 'entry' : 'entries'}`;
  $('#list').innerHTML = visible.map(item => `<tr><td>${escapeHTML(item.date)}</td><td>${escapeHTML(item.description)}</td><td><span class="category-tag">${escapeHTML(item.category)}</span></td><td class="amount ${Number(item.amount) >= 0 ? 'income' : 'expense'}">${Number(item.amount) > 0 ? '+' : ''}${money(item.amount)}</td><td><button type="button" class="delete" data-index="${item.index}" aria-label="Delete ${escapeHTML(item.description)}">×</button></td></tr>`).join('');
  $('#empty-transactions').hidden = visible.length > 0;
  $('#undo').disabled = !history.canUndo(); $('#redo').disabled = !history.canRedo();
}
function renderBudgets() {
  const rows = checkBudgets(transactions, budgets, $('#budget-month').value || thisMonth);
  $('#budgets').innerHTML = rows.map(row => `<tr class="${row.over ? 'over' : ''}"><td>${escapeHTML(row.category)}</td><td>${money(row.limit)}</td><td class="${row.over ? 'expense' : ''}">${money(row.spent)}</td><td><span class="status ${row.over ? 'over' : ''}">${row.over ? 'Over limit' : 'On track'}</span></td></tr>`).join('');
  $('#empty-budgets').hidden = budgets.length > 0;
}
function renderReport() {
  const month = $('#report-month').value || thisMonth;
  const summary = summarize(transactions, { from: `${month}-01`, to: `${month}-31` });
  const entries = Object.entries(summary.byCategory).sort((a, b) => a[0].localeCompare(b[0]));
  $('#report').innerHTML = entries.map(([category, total]) => `<tr><td>${escapeHTML(category)}</td><td class="amount ${total >= 0 ? 'income' : 'expense'}">${money(total)}</td></tr>`).join('');
  $('#empty-report').hidden = entries.length > 0;
  const expenses = entries.filter(([, total]) => total < 0).map(([category, total]) => [category, Math.abs(total)]);
  $('#empty-chart').hidden = expenses.length > 0;
  drawChart(expenses);
}
function drawChart(entries) {
  const canvas = $('#chart'), rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr)); canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const width = rect.width, height = rect.height, left = 48, right = 12, top = 12, bottom = 38;
  ctx.clearRect(0, 0, width, height);
  if (!entries.length) return;
  const max = Math.max(...entries.map(([, value]) => value), 1);
  ctx.font = '10px DM Sans, sans-serif'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const y = top + (height - top - bottom) * i / 4;
    ctx.strokeStyle = '#edf1ed'; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke();
    ctx.fillStyle = '#89968e'; ctx.textAlign = 'right'; ctx.fillText((max * (1 - i / 4)).toFixed(0), left - 9, y);
  }
  const plotWidth = width - left - right, plotHeight = height - top - bottom, slot = plotWidth / entries.length;
  entries.forEach(([category, value], index) => {
    const barWidth = Math.min(46, slot * .55), barHeight = value / max * plotHeight;
    const x = left + slot * index + (slot - barWidth) / 2, y = top + plotHeight - barHeight;
    ctx.fillStyle = '#6f9f80'; ctx.beginPath(); ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]); ctx.fill();
    ctx.fillStyle = '#718078'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const label = category.length > 12 ? `${category.slice(0, 11)}…` : category;
    ctx.fillText(label, left + slot * index + slot / 2, height - bottom + 9);
  });
}
function renderAll() { renderTransactions(); renderBudgets(); renderReport(); save(); }
function route() {
  const routeName = location.hash.replace(/^#\/?/, '') || 'transactions';
  const active = ['transactions', 'budgets', 'reports'].includes(routeName) ? routeName : 'transactions';
  for (const name of ['transactions', 'budgets', 'reports']) {
    $(`#view-${name}`).hidden = name !== active;
    $(`#nav-${name}`).classList.toggle('active', name === active);
  }
  if (active === 'reports') renderReport();
}

$('#transaction-form').addEventListener('submit', event => {
  event.preventDefault();
  const item = { date: $('#date').value, description: $('#description').value.trim(), amount: Number($('#amount').value), category: $('#category').value.trim() };
  const repeat = $('#repeat').value;
  const added = repeat === 'none' ? [item] : expandRecurring({ ...item, every: repeat }, $('#until').value);
  if (!added.length) { $('#until').setCustomValidity('Choose an end date on or after the transaction date.'); $('#until').reportValidity(); return; }
  $('#until').setCustomValidity('');
  transactions.push(...added); history.push(transactions); event.currentTarget.reset(); $('#date').value = today; $('#until-field').hidden = true; renderAll();
});
$('#repeat').addEventListener('change', () => { $('#until-field').hidden = $('#repeat').value === 'none'; $('#until').required = $('#repeat').value !== 'none'; });
$('#until').addEventListener('input', () => $('#until').setCustomValidity(''));
$('#list').addEventListener('click', event => {
  const button = event.target.closest('.delete'); if (!button) return;
  transactions.splice(Number(button.dataset.index), 1); history.push(transactions); renderAll();
});
$('#search').addEventListener('input', event => { search = event.target.value; renderTransactions(); });
const sort = () => { sortAmount = !sortAmount; renderTransactions(); };
$('#sort-amount').addEventListener('click', sort);
$('#sort-amount').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sort(); } });
$('#undo').addEventListener('click', () => { if (!history.canUndo()) return; transactions.splice(0, transactions.length, ...history.undo()); renderAll(); });
$('#redo').addEventListener('click', () => { if (!history.canRedo()) return; transactions.splice(0, transactions.length, ...history.redo()); renderAll(); });
$('#import').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try { const rows = parseCSV(await file.text()); if (rows.length) { transactions.push(...rows); history.push(transactions); renderAll(); } }
  catch (error) { alert(`Could not import CSV: ${error.message}`); }
  event.target.value = '';
});
$('#export').addEventListener('click', () => {
  const blob = new Blob([toCSV(transactions)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'transactions.csv'; link.click(); URL.revokeObjectURL(url);
});
$('#budget-form').addEventListener('submit', event => {
  event.preventDefault(); budgets.push({ category: $('#budget-category').value.trim(), limit: Number($('#budget-limit').value) });
  event.currentTarget.reset(); renderAll();
});
$('#budget-month').addEventListener('input', renderBudgets);
$('#report-month').addEventListener('input', renderReport);
window.addEventListener('hashchange', route);
window.addEventListener('resize', () => { if (!$('#view-reports').hidden) renderReport(); });
renderAll(); route();
