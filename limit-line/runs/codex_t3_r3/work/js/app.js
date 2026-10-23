import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';

const STORAGE_KEY = 'pocket-ledger-transactions';
const $ = selector => document.querySelector(selector);
let items = loadItems();
let filter = 'All';
const colors = ['#668b69', '#d69a68', '#7b91ae', '#c68172', '#9b85b0', '#73a7a0', '#c6ad62'];

function loadItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(item => item && Number.isFinite(Number(item.amount))) : [];
  } catch { return []; }
}
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* Storage can be unavailable in private browsing. */ } }
function money(value) { return Number(value || 0).toFixed(2); }
function displayDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function render() {
  const totals = summarize(items);
  $('#balance').textContent = money(totals.balance);
  $('#income').textContent = money(totals.income);
  $('#expense').textContent = money(totals.expense);

  const categories = [...new Set(items.map(item => String(item.category || 'Other')))].sort((a, b) => a.localeCompare(b));
  const select = $('#filter');
  const previous = filter;
  select.replaceChildren(new Option('All categories', 'All'));
  categories.forEach(category => select.add(new Option(category, category)));
  filter = categories.includes(previous) || previous === 'All' ? previous : 'All';
  select.value = filter;

  const visible = items.map((item, index) => ({ item, index })).filter(({ item }) => filter === 'All' || String(item.category || 'Other') === filter).sort((a, b) => String(b.item.date).localeCompare(String(a.item.date)));
  const list = $('#list');
  list.replaceChildren();
  for (const { item, index } of visible) {
    const row = document.createElement('tr');
    const description = document.createElement('td'); description.textContent = item.description;
    const categoryCell = document.createElement('td');
    const pill = document.createElement('span'); pill.className = 'category-pill';
    const dot = document.createElement('i'); dot.className = 'category-dot';
    pill.append(dot, document.createTextNode(item.category || 'Other')); categoryCell.append(pill);
    const date = document.createElement('td'); date.textContent = displayDate(item.date);
    const amount = document.createElement('td'); amount.className = `amount-cell ${Number(item.amount) >= 0 ? 'positive' : 'negative'}`; amount.textContent = `${Number(item.amount) >= 0 ? '+' : '−'}$${money(Math.abs(item.amount))}`;
    const action = document.createElement('td');
    const remove = document.createElement('button'); remove.className = 'delete'; remove.type = 'button'; remove.setAttribute('aria-label', `Delete ${item.description}`); remove.textContent = '×'; remove.addEventListener('click', () => { items.splice(index, 1); save(); render(); });
    action.append(remove); row.append(description, categoryCell, date, amount, action); list.append(row);
  }
  $('#empty-state').style.display = visible.length ? 'none' : 'flex';
  $('#transaction-count').textContent = String(items.length);
  $('#showing-count').textContent = String(visible.length);
  renderChart(totals.byCategory);
}

function renderChart(byCategory) {
  const canvas = $('#chart');
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  const width = rect.width, height = rect.height;
  const data = Object.entries(byCategory).filter(([, amount]) => amount < 0).map(([name, amount]) => [name, Math.abs(amount)]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const legend = $('#chart-legend'); legend.replaceChildren();
  if (!data.length) {
    ctx.fillStyle = '#a2aaa1'; ctx.font = '11px DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Add an expense to see your breakdown', width / 2, height / 2);
    return;
  }
  const max = Math.max(...data.map(([, value]) => value));
  const left = 28, right = 8, top = 9, bottom = 28;
  const plotW = width - left - right, plotH = height - top - bottom;
  ctx.font = '9px DM Sans, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 3; i++) {
    const y = top + plotH * i / 3;
    ctx.strokeStyle = '#eef0ec'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke();
    ctx.fillStyle = '#a2aaa1'; ctx.fillText((max * (1 - i / 3)).toFixed(0), left - 6, y);
  }
  const slot = plotW / data.length, barW = Math.min(29, slot * .48);
  data.forEach(([name, value], i) => {
    const barH = Math.max(2, value / max * plotH), x = left + slot * i + (slot - barW) / 2, y = top + plotH - barH;
    ctx.fillStyle = colors[i % colors.length]; roundedBar(ctx, x, y, barW, barH, 4);
    ctx.fillStyle = '#89928a'; ctx.font = '9px DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const label = name.length > 9 ? `${name.slice(0, 8)}…` : name;
    ctx.fillText(label, x + barW / 2, top + plotH + 9);
    const chip = document.createElement('span'); chip.className = 'legend-chip';
    const swatch = document.createElement('i'); swatch.style.backgroundColor = colors[i % colors.length];
    chip.append(swatch, document.createTextNode(name)); legend.append(chip);
  });
}
function roundedBar(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r); ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r); ctx.fill();
}

$('#transaction-form').addEventListener('submit', event => {
  event.preventDefault();
  const amount = Number($('#amount').value);
  if (!Number.isFinite(amount) || amount === 0) { $('#amount').setCustomValidity('Enter a nonzero amount.'); $('#amount').reportValidity(); $('#amount').setCustomValidity(''); return; }
  items.push({ date: $('#date').value, description: $('#description').value.trim(), amount, category: $('#category').value.trim() || 'Other' });
  save(); event.currentTarget.reset(); $('#date').value = new Date().toISOString().slice(0, 10); $('#description').focus(); render();
});
$('#filter').addEventListener('change', event => { filter = event.target.value; render(); });
$('#import').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    const imported = parseCSV(await file.text());
    items.push(...imported); save(); render();
  } catch (error) { window.alert(error.message || 'Could not read that CSV file.'); }
  event.target.value = '';
});
$('#export').addEventListener('click', () => {
  const blob = new Blob([toCSV(items)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = 'pocket-ledger.csv'; link.click(); URL.revokeObjectURL(url);
});

$('#date').value = new Date().toISOString().slice(0, 10);
$('#today').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
window.addEventListener('resize', render);
render();
