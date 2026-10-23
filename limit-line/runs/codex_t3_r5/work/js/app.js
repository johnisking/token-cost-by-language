import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
const KEY = 'little-ledger-transactions';
const form = document.querySelector('#transaction-form');
const list = document.querySelector('#list');
const filter = document.querySelector('#filter');
const fmt = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let transactions = readSaved();
function readSaved() {
  try { const data = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(data) ? data : []; }
  catch { return []; }
}
function save() { localStorage.setItem(KEY, JSON.stringify(transactions)); }
function renderRows() {
  const visible = transactions.map((item, index) => ({ item, index })).filter(({ item }) => filter.value === 'All' || (item.category || 'Other') === filter.value).sort((a, b) => b.item.date.localeCompare(a.item.date));
  list.replaceChildren();
  for (const { item, index } of visible) {
    const tr = document.createElement('tr');
    const date = document.createElement('td'); date.textContent = item.date;
    const description = document.createElement('td'); description.textContent = item.description;
    const cat = document.createElement('td'); const pill = document.createElement('span'); pill.className = 'category-pill'; pill.textContent = item.category || 'Other'; cat.append(pill);
    const amount = document.createElement('td'); amount.className = 'amount-cell ' + (item.amount >= 0 ? 'positive' : 'negative'); amount.textContent = (item.amount > 0 ? '+' : item.amount < 0 ? '−' : '') + fmt.format(Math.abs(item.amount));
    const actions = document.createElement('td'); const del = document.createElement('button'); del.type = 'button'; del.className = 'delete'; del.textContent = '×'; del.dataset.index = index; del.setAttribute('aria-label', 'Delete ' + item.description); actions.append(del);
    tr.append(date, description, cat, amount, actions); list.append(tr);
  }
  document.querySelector('#empty-state').hidden = visible.length > 0;
  document.querySelector('#count').textContent = transactions.length + (transactions.length === 1 ? ' entry' : ' entries');
}
function renderChart() {
  const canvas = document.querySelector('#chart'), ctx = canvas.getContext('2d');
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
  const expenses = {};
  for (const item of transactions) if (Number(item.amount) < 0) { const category = item.category || 'Other'; expenses[category] = (expenses[category] || 0) + Math.abs(Number(item.amount)); }
  const values = Object.entries(expenses).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
  document.querySelector('#chart-empty').style.display = values.length ? 'none' : 'block';
  if (!values.length) return;
  const gap = 13, bw = Math.max(12, (w - gap * (values.length - 1)) / values.length), base = h - 23, max = Math.max(...values.map(v => v[1]));
  ctx.font = '9px Segoe UI'; ctx.textAlign = 'center';
  values.forEach(([name, value], i) => {
    const x = i * (bw + gap), bh = Math.max(3, (value / max) * (base - 22));
    ctx.fillStyle = '#84a383'; ctx.fillRect(x, base - bh, bw, bh);
    ctx.fillStyle = '#829087'; ctx.fillText(name.length > 10 ? name.slice(0, 9) + '…' : name, x + bw / 2, h - 4);
  });
}
function render() {
  const cats = [...new Set(transactions.map(t => t.category || 'Other'))].sort((a, b) => a.localeCompare(b));
  const selected = filter.value;
  filter.replaceChildren(new Option('All categories', 'All'), ...cats.map(c => new Option(c, c)));
  filter.value = cats.includes(selected) ? selected : 'All';
  const totals = summarize(transactions);
  document.querySelector('#balance').textContent = fmt.format(totals.balance);
  document.querySelector('#income').textContent = fmt.format(totals.income);
  document.querySelector('#expense').textContent = fmt.format(totals.expense);
  renderRows(); renderChart();
}
document.querySelector('#date').value = new Date().toISOString().slice(0, 10);
form.addEventListener('submit', event => {
  event.preventDefault(); const data = new FormData(form), amount = Number(data.get('amount'));
  if (!Number.isFinite(amount)) return;
  transactions.push({ date: String(data.get('date')), description: String(data.get('description')).trim(), amount, category: String(data.get('category')).trim() || 'Other' });
  save(); form.reset(); document.querySelector('#date').value = new Date().toISOString().slice(0, 10); filter.value = 'All'; render();
});
list.addEventListener('click', event => { const button = event.target.closest('.delete'); if (!button) return; transactions.splice(Number(button.dataset.index), 1); save(); render(); });
filter.addEventListener('change', renderRows);
document.querySelector('#import').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try { transactions.push(...parseCSV(await file.text())); save(); filter.value = 'All'; render(); }
  catch (error) { alert(error.message || 'Could not import CSV.'); }
  event.target.value = '';
});
document.querySelector('#export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([toCSV(transactions)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'little-ledger.csv'; a.click(); URL.revokeObjectURL(url);
});
window.addEventListener('resize', render);
render();


