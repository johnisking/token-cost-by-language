import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';

const STORAGE_KEY = 'expense-tracker-transactions';
const form = document.querySelector('#transaction-form');
const list = document.querySelector('#list');
const filter = document.querySelector('#filter');
const balance = document.querySelector('#balance');
const emptyState = document.querySelector('#empty-state');
const status = document.querySelector('#status');
let items = loadItems();

function loadItems() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

function saveItems() { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function money(value) { return Number(value).toFixed(2); }

function render() {
  const summary = summarize(items);
  balance.textContent = money(summary.balance);
  const categories = [...new Set(items.map(item => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const selected = filter.value;
  filter.replaceChildren(new Option('All', 'All'), ...categories.map(category => new Option(category, category)));
  filter.value = categories.includes(selected) ? selected : 'All';

  const visible = items.map((item, index) => ({ item, index }))
    .filter(({ item }) => filter.value === 'All' || item.category === filter.value)
    .sort((a, b) => String(b.item.date).localeCompare(String(a.item.date)));
  list.replaceChildren();
  for (const { item, index } of visible) {
    const row = document.createElement('tr');
    for (const value of [item.date, item.description, item.category]) {
      const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
    }
    const amountCell = document.createElement('td'); amountCell.className = `numeric ${Number(item.amount) >= 0 ? 'positive' : 'negative'}`;
    amountCell.textContent = `${Number(item.amount) > 0 ? '+' : ''}${money(item.amount)}`; row.append(amountCell);
    const actionCell = document.createElement('td');
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete'; remove.textContent = 'Delete'; remove.setAttribute('aria-label', `Delete ${item.description}`);
    remove.addEventListener('click', () => { items.splice(index, 1); saveItems(); render(); });
    actionCell.append(remove); row.append(actionCell); list.append(row);
  }
  emptyState.hidden = visible.length > 0;
  drawChart();
}

function drawChart() {
  const canvas = document.querySelector('#chart');
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  const width = rect.width, height = rect.height;
  ctx.clearRect(0, 0, width, height);
  const totals = {};
  for (const item of items) {
    const amount = Number(item.amount);
    if (amount < 0) totals[item.category] = (totals[item.category] ?? 0) + Math.abs(amount);
  }
  const expenses = Object.entries(totals).filter(([, value]) => value > 0).sort(([a], [b]) => a.localeCompare(b));
  if (!expenses.length) {
    ctx.fillStyle = '#87928e'; ctx.font = '13px Arial'; ctx.textAlign = 'center';
    ctx.fillText('No expenses to chart yet', width / 2, height / 2); return;
  }
  const max = Math.max(...expenses.map(([, value]) => value));
  const left = 8, right = 8, top = 10, bottom = 42;
  const plotHeight = height - top - bottom, plotWidth = width - left - right;
  const slot = plotWidth / expenses.length, barWidth = Math.min(54, slot * .56);
  ctx.strokeStyle = '#e8eeea'; ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = top + plotHeight * i / 3;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke();
  }
  expenses.forEach(([name, value], index) => {
    const barHeight = Math.max(2, plotHeight * value / max);
    const x = left + slot * index + (slot - barWidth) / 2, y = top + plotHeight - barHeight;
    ctx.fillStyle = '#4e9a77'; ctx.beginPath(); ctx.roundRect(x, y, barWidth, barHeight, 5); ctx.fill();
    ctx.fillStyle = '#596762'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
    const label = name.length > 12 ? `${name.slice(0, 11)}…` : name;
    ctx.fillText(label, x + barWidth / 2, height - 12);
  });
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const amount = Number(document.querySelector('#amount').value);
  if (!Number.isFinite(amount)) return;
  items.push({
    date: document.querySelector('#date').value,
    description: document.querySelector('#description').value.trim(),
    amount,
    category: document.querySelector('#category').value.trim()
  });
  saveItems(); form.reset(); document.querySelector('#date').value = new Date().toISOString().slice(0, 10); render();
  status.textContent = 'Transaction added.';
});

filter.addEventListener('change', render);
document.querySelector('#import').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const imported = parseCSV(await file.text());
    items.push(...imported); saveItems(); render();
    status.textContent = `${imported.length} transaction${imported.length === 1 ? '' : 's'} imported.`;
  } catch { status.textContent = 'Could not read that CSV file.'; }
  event.target.value = '';
});

document.querySelector('#export').addEventListener('click', () => {
  const blob = new Blob([toCSV(items)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'transactions.csv'; link.click(); URL.revokeObjectURL(url);
});

document.querySelector('#date').value = new Date().toISOString().slice(0, 10);
window.addEventListener('resize', drawChart);
render();
