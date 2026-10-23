import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const $ = selector => document.querySelector(selector);
const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);
const load = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
let transactions = load('pocket-budget-transactions', []);
let budgets = load('pocket-budget-budgets', []);
const transactionHistory = createHistory(transactions);
let amountDescending = false;

$('#date').value = today;
$('#budget-month').value = currentMonth;
$('#report-month').value = currentMonth;

function persist() {
  localStorage.setItem('pocket-budget-transactions', JSON.stringify(transactions));
  localStorage.setItem('pocket-budget-budgets', JSON.stringify(budgets));
}
function money(value) { return Number(value || 0).toFixed(2); }
function renderTransactions() {
  const query = $('#search').value.trim().toLocaleLowerCase();
  const shown = transactions.map((item, index) => ({ item, index })).filter(({ item }) => item.description.toLocaleLowerCase().includes(query));
  if (amountDescending) shown.sort((a, b) => Number(b.item.amount) - Number(a.item.amount));
  $('#list').innerHTML = shown.map(({ item, index }) => `<tr><td>${escapeHTML(item.date)}</td><td>${escapeHTML(item.description)}</td><td><span class="category-pill">${escapeHTML(item.category)}</span></td><td class="amount">${money(item.amount)}</td><td><button class="delete" type="button" data-index="${index}" aria-label="Delete ${escapeHTML(item.description)}">×</button></td></tr>`).join('');
  $('#empty-transactions').hidden = shown.length > 0;
  $('#balance').textContent = money(summarize(transactions).balance);
  $('#undo').disabled = !transactionHistory.canUndo(); $('#redo').disabled = !transactionHistory.canRedo();
}
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function renderBudgets() {
  const rows = checkBudgets(transactions, budgets, $('#budget-month').value || currentMonth);
  $('#budgets').innerHTML = rows.map(row => `<tr class="${row.over ? 'over' : ''}"><td>${escapeHTML(row.category)}</td><td>${money(row.limit)}</td><td>${money(row.spent)}</td><td>${row.over ? '<span class="status-over">Over limit</span>' : ''}</td></tr>`).join('');
  $('#empty-budgets').hidden = rows.length > 0;
}
function renderReport() {
  const month = $('#report-month').value || currentMonth;
  const items = transactions.filter(item => item.date.startsWith(`${month}-`));
  const totals = summarize(items).byCategory;
  const entries = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
  $('#report').innerHTML = entries.map(([category, total]) => `<tr><td>${escapeHTML(category)}</td><td class="amount">${money(total)}</td></tr>`).join('');
  $('#empty-report').hidden = entries.length > 0;
  drawChart(items);
}
function drawChart(items) {
  const canvas = $('#chart'), rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const totals = {};
  for (const item of items) if (Number(item.amount) < 0) totals[item.category] = (totals[item.category] || 0) - Number(item.amount);
  const values = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  $('#empty-chart').hidden = values.length > 0;
  if (!values.length) return;
  const width = rect.width, height = rect.height, left = 34, right = 10, top = 8, bottom = 35;
  const max = Math.max(...values.map(([, v]) => v)), chartHeight = height - top - bottom, gap = 13;
  const barWidth = Math.max(12, (width - left - right - gap * (values.length - 1)) / values.length);
  ctx.font = '10px DM Sans, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#8a958e';
  for (let tick = 0; tick <= 3; tick++) { const y = top + chartHeight * tick / 3; const amount = max * (1 - tick / 3); ctx.strokeStyle = '#edf0ec'; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke(); ctx.fillText(amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount.toFixed(0), left - 6, y + 3); }
  values.forEach(([category, value], index) => {
    const x = left + index * (barWidth + gap), barHeight = value / max * chartHeight, y = top + chartHeight - barHeight;
    ctx.fillStyle = '#55a67f'; ctx.beginPath(); ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]); ctx.fill();
    ctx.fillStyle = '#76827b'; ctx.textAlign = 'center'; const label = category.length > 10 ? `${category.slice(0, 9)}…` : category; ctx.fillText(label, x + barWidth / 2, height - 13);
  });
}
function renderAll() { persist(); renderTransactions(); renderBudgets(); renderReport(); }
function changeTransactions(next) { transactions = next; transactionHistory.push(transactions); renderAll(); }
function updateView() {
  const hash = location.hash || '#/transactions';
  const route = ['#/budgets', '#/reports'].includes(hash) ? hash : '#/transactions';
  if (location.hash !== route) window.history.replaceState(null, '', route);
  for (const [name, path] of [['transactions', '#/transactions'], ['budgets', '#/budgets'], ['reports', '#/reports']]) {
    $(`#view-${name}`).hidden = route !== path;
    $(`#nav-${name}`).classList.toggle('active', route === path);
  }
  if (route === '#/reports') renderReport();
}

$('#repeat').addEventListener('change', () => { const show = $('#repeat').value !== 'none'; $('#until-label').hidden = !show; $('#until').required = show; if (show && !$('#until').value) $('#until').value = $('#date').value; });
$('#date').addEventListener('change', () => { if ($('#repeat').value !== 'none' && $('#until').value < $('#date').value) $('#until').value = $('#date').value; });
$('#transaction-form').addEventListener('submit', event => {
  event.preventDefault();
  const base = { date: $('#date').value, description: $('#description').value.trim(), amount: Number($('#amount').value), category: $('#category').value.trim() };
  if (!base.date || !base.description || !base.category || !Number.isFinite(base.amount)) return;
  let added = [base];
  if ($('#repeat').value !== 'none') {
    if ($('#until').value < base.date) { $('#until').setCustomValidity('End date must be on or after the transaction date.'); $('#until').reportValidity(); $('#until').setCustomValidity(''); return; }
    added = expandRecurring({ ...base, every: $('#repeat').value }, $('#until').value);
  }
  changeTransactions([...transactions, ...added]);
  $('#description').value = ''; $('#amount').value = ''; $('#description').focus();
});
$('#list').addEventListener('click', event => { const button = event.target.closest('.delete'); if (!button) return; const index = Number(button.dataset.index); changeTransactions(transactions.filter((_, i) => i !== index)); });
$('#search').addEventListener('input', renderTransactions);
$('#sort-amount').addEventListener('click', () => { amountDescending = !amountDescending; renderTransactions(); });
$('#sort-amount').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); amountDescending = !amountDescending; renderTransactions(); } });
$('#undo').addEventListener('click', () => { transactions = transactionHistory.undo(); renderAll(); });
$('#redo').addEventListener('click', () => { transactions = transactionHistory.redo(); renderAll(); });
$('#export').addEventListener('click', () => { const blob = new Blob([toCSV(transactions)], { type: 'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'transactions.csv'; link.click(); URL.revokeObjectURL(link.href); });
$('#import').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try { const imported = parseCSV(await file.text()); if (imported.length) changeTransactions([...transactions, ...imported]); }
  catch (error) { alert(`Could not import CSV: ${error.message}`); }
  finally { event.target.value = ''; }
});
$('#budget-form').addEventListener('submit', event => {
  event.preventDefault(); const category = $('#budget-category').value.trim(), limit = Number($('#budget-limit').value);
  if (!category || !Number.isFinite(limit) || limit <= 0) return;
  budgets.push({ category, limit }); renderAll(); $('#budget-category').value = ''; $('#budget-limit').value = '';
});
$('#budget-month').addEventListener('change', renderBudgets);
$('#report-month').addEventListener('change', renderReport);
window.addEventListener('hashchange', updateView);
window.addEventListener('resize', () => { if (!$('#view-reports').hidden) renderReport(); });
updateView(); renderAll();
