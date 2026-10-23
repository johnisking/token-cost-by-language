import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const $ = selector => document.querySelector(selector);
const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);
const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let transactions = readStore('pocketwise-transactions', []);
let budgets = readStore('pocketwise-budgets', []);
const transactionHistory = createHistory(transactions);
let sortAmount = false;

$('#date').value = today;
$('#until').value = today;
$('#budget-month').value = currentMonth;
$('#report-month').value = currentMonth;

function persist() {
  localStorage.setItem('pocketwise-transactions', JSON.stringify(transactions));
  localStorage.setItem('pocketwise-budgets', JSON.stringify(budgets));
}
function money(value) { return Number(value || 0).toFixed(2); }
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function changed(next) { transactionHistory.push(next); transactions = next; persist(); render(); }
function renderTransactions() {
  const query = $('#search').value.trim().toLowerCase();
  const items = transactions.map((item, index) => ({ ...item, _index: index })).filter(item => item.description.toLowerCase().includes(query));
  if (sortAmount) items.sort((a, b) => Number(b.amount) - Number(a.amount));
  $('#list').innerHTML = items.map(item => `<tr><td>${escapeHTML(item.date)}</td><td>${escapeHTML(item.description)}</td><td>${escapeHTML(item.category)}</td><td class="amount ${Number(item.amount) >= 0 ? 'income' : ''}">${Number(item.amount) < 0 ? '−' : '+'}$${money(Math.abs(Number(item.amount)))}</td><td><button class="delete" data-index="${item._index}" aria-label="Delete ${escapeHTML(item.description)}" title="Delete">×</button></td></tr>`).join('');
  $('#empty-state').hidden = items.length > 0;
  $('#transaction-count').textContent = transactions.length;
  $('#balance').textContent = money(summarize(transactions).balance);
  $('#undo').disabled = !transactionHistory.canUndo(); $('#redo').disabled = !transactionHistory.canRedo();
  $('#undo').style.opacity = transactionHistory.canUndo() ? '1' : '.45'; $('#redo').style.opacity = transactionHistory.canRedo() ? '1' : '.45';
}
function renderBudgets() {
  const results = checkBudgets(transactions, budgets, $('#budget-month').value || currentMonth);
  $('#budgets').innerHTML = results.map(item => `<tr class="${item.over ? 'over' : ''}"><td>${escapeHTML(item.category)}</td><td>$${money(item.limit)}</td><td>$${money(item.spent)}</td><td class="budget-status">${item.over ? 'Over limit' : 'On track'}</td></tr>`).join('');
  $('#budgets-empty').hidden = budgets.length > 0;
}
function renderReport() {
  const month = $('#report-month').value || currentMonth;
  const end = new Date(`${month}-01T00:00:00Z`); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
  const summary = summarize(transactions, { from: `${month}-01`, to: end.toISOString().slice(0, 10) });
  const entries = Object.entries(summary.byCategory).sort((a, b) => a[0].localeCompare(b[0]));
  $('#report').innerHTML = entries.map(([category, amount]) => `<tr><td>${escapeHTML(category)}</td><td class="${amount < 0 ? 'amount' : 'amount income'}">${amount < 0 ? '−' : '+'}$${money(Math.abs(amount))}</td></tr>`).join('');
  $('#report-empty').hidden = entries.length > 0;
  drawChart(entries.filter(([, amount]) => amount < 0).map(([category, amount]) => [category, Math.abs(amount)]));
}
function drawChart(data) {
  const canvas = $('#chart'), dpr = window.devicePixelRatio || 1, width = canvas.clientWidth || 420, height = 220;
  canvas.width = width * dpr; canvas.height = height * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height);
  if (!data.length) { ctx.fillStyle = '#a0aaa5'; ctx.font = '12px DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('No expenses to show', width / 2, 110); return; }
  const max = Math.max(...data.map(([, value]) => value));
  const left = 12, right = 12, top = 12, bottom = 42, chartH = height - top - bottom;
  const slot = (width - left - right) / data.length, barWidth = Math.min(38, slot * .56);
  data.forEach(([name, value], i) => {
    const x = left + i * slot + (slot - barWidth) / 2, h = Math.max(3, value / max * chartH), y = top + chartH - h;
    ctx.fillStyle = '#74ad94'; ctx.beginPath(); ctx.roundRect(x, y, barWidth, h, 5); ctx.fill();
    ctx.fillStyle = '#71837b'; ctx.font = '10px DM Sans, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(name.length > 12 ? `${name.slice(0, 11)}…` : name, x + barWidth / 2, height - 15);
  });
}
function render() { renderTransactions(); renderBudgets(); renderReport(); }

const views = { '#/transactions': 'transactions', '#/budgets': 'budgets', '#/reports': 'reports' };
function route() {
  const routeName = views[location.hash] || 'transactions';
  if (!views[location.hash]) window.history.replaceState(null, '', '#/transactions');
  document.querySelectorAll('.view').forEach(view => { view.hidden = view.id !== `view-${routeName}`; });
  document.querySelectorAll('.topbar nav a').forEach(link => link.classList.toggle('active', link.id === `nav-${routeName}`));
}
window.addEventListener('hashchange', route); route();

$('#repeat').addEventListener('change', () => { const repeating = $('#repeat').value !== 'none'; $('#until-wrap').classList.toggle('visible', repeating); $('#until').required = repeating; });
$('#transaction-form').addEventListener('submit', event => {
  event.preventDefault();
  const rule = { date: $('#date').value, description: $('#description').value.trim(), amount: Number($('#amount').value), category: $('#category').value, every: $('#repeat').value };
  if (!rule.date || !rule.description || !Number.isFinite(rule.amount)) return;
  const additions = rule.every === 'none' ? [{ date: rule.date, description: rule.description, amount: rule.amount, category: rule.category }] : expandRecurring(rule, $('#until').value);
  if (!additions.length) return;
  changed([...transactions, ...additions]);
  $('#description').value = ''; $('#amount').value = ''; $('#repeat').value = 'none'; $('#until-wrap').classList.remove('visible'); $('#until').required = false;
});
$('#list').addEventListener('click', event => {
  const button = event.target.closest('.delete'); if (!button) return;
  const index = Number(button.dataset.index); changed(transactions.filter((_, i) => i !== index));
});
$('#search').addEventListener('input', renderTransactions);
function toggleSort() { sortAmount = !sortAmount; renderTransactions(); }
$('#sort-amount').addEventListener('click', toggleSort);
$('#sort-amount').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleSort(); } });
$('#undo').addEventListener('click', () => { if (transactionHistory.canUndo()) { transactions = transactionHistory.undo(); persist(); render(); } });
$('#redo').addEventListener('click', () => { if (transactionHistory.canRedo()) { transactions = transactionHistory.redo(); persist(); render(); } });
$('#export').addEventListener('click', () => {
  const blob = new Blob([toCSV(transactions)], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'transactions.csv'; link.click(); URL.revokeObjectURL(url);
});
$('#import').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  const rows = parseCSV(await file.text()).filter(item => item.date && Number.isFinite(item.amount));
  if (rows.length) changed([...transactions, ...rows]);
  event.target.value = '';
});
$('#budget-form').addEventListener('submit', event => {
  event.preventDefault();
  const category = $('#budget-category').value.trim(), limit = Number($('#budget-limit').value);
  if (!category || !(limit > 0)) return;
  budgets.push({ category, limit }); persist(); renderBudgets();
  $('#budget-category').value = ''; $('#budget-limit').value = '';
});
$('#budget-month').addEventListener('change', renderBudgets);
$('#report-month').addEventListener('change', renderReport);
window.addEventListener('resize', renderReport);
render();
