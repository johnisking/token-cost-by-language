import { parseCSV, toCSV } from './csv.js'; import { summarize } from './summary.js'; import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js'; import { createHistory } from './history.js';
const $ = s => document.querySelector(s);
const h = createHistory(JSON.parse(localStorage.getItem('r4_tx') || '[]')); let budgets = JSON.parse(localStorage.getItem('r4_b') || '[]'); let sortAmt = false;
const now = new Date().toISOString().slice(0, 7); $('#budget-month').value = now; $('#report-month').value = now;
const set = items => { h.push(items); save(); render(); };
function save() { localStorage.setItem('r4_tx', JSON.stringify(h.state())); localStorage.setItem('r4_b', JSON.stringify(budgets)); }
function route() { const v = (location.hash.replace('#/', '') || 'transactions'); for (const k of ['transactions', 'budgets', 'reports']) $('#view-' + k).hidden = k !== (['transactions', 'budgets', 'reports'].includes(v) ? v : 'transactions'); }
function render() { const items = h.state(); const q = $('#search').value.toLowerCase();
  let rows = items.map((it, idx) => ({ it, idx })).filter(r => r.it.description.toLowerCase().includes(q)); if (sortAmt) rows.sort((a, b) => b.it.amount - a.it.amount);
  const tb = $('#list tbody'); tb.innerHTML = '';
  for (const { it, idx } of rows) { const tr = document.createElement('tr'); tr.innerHTML = `<td>${it.date}</td><td></td><td>${it.amount.toFixed(2)}</td><td></td><td><button class="delete">x</button></td>`;
    tr.children[1].textContent = it.description; tr.children[3].textContent = it.category; tr.querySelector('.delete').onclick = () => set(items.filter((_, j) => j !== idx)); tb.appendChild(tr); }
  $('#balance').textContent = summarize(items).balance.toFixed(2);
  const bt = $('#budgets tbody'); bt.innerHTML = '';
  for (const b of checkBudgets(items, budgets, $('#budget-month').value)) { const tr = document.createElement('tr'); if (b.over) tr.className = 'over'; tr.innerHTML = `<td>${b.category}</td><td>${b.limit.toFixed(2)}</td><td>${b.spent.toFixed(2)}</td>`; bt.appendChild(tr); }
  const m = $('#report-month').value; const [y, mo] = m.split('-').map(Number); const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const s = summarize(items, { from: m + '-01', to: m + '-' + String(last).padStart(2, '0') }); const rt = $('#report tbody'); rt.innerHTML = '';
  for (const [k, v] of Object.entries(s.byCategory)) { const tr = document.createElement('tr'); tr.innerHTML = `<td>${k}</td><td>${v.toFixed(2)}</td>`; rt.appendChild(tr); }
  const c = $('#chart').getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 400, 200); c.fillStyle = '#e44'; const ex = Object.entries(s.byCategory).filter(([, v]) => v < 0); const mx = Math.max(1, ...ex.map(([, v]) => -v));
  ex.forEach(([, v], j) => c.fillRect(10 + j * 60, 190 - (-v / mx) * 170, 40, (-v / mx) * 170)); }
$('#add').onclick = () => { const base = { date: $('#date').value, description: $('#description').value, amount: Number($('#amount').value), category: $('#category').value };
  const rep = $('#repeat').value; set(h.state().concat(rep === 'none' ? [base] : expandRecurring({ ...base, every: rep }, $('#until').value))); };
 $('#redo').onclick = () => { h.redo(); save(); render(); };
$('#search').oninput = render; $('#sort-amount').onclick = () => { sortAmt = true; render(); };
$('#import').onchange = async e => set(h.state().concat(parseCSV(await e.target.files[0].text())));
$('#export').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toCSV(h.state())])); a.download = 'tx.csv'; a.click(); };
$('#budget-add').onclick = () => { budgets.push({ category: $('#budget-category').value, limit: Number($('#budget-limit').value) }); save(); render(); };
$('#budget-month').onchange = render; $('#budget-month').oninput = render; $('#report-month').onchange = render; $('#report-month').oninput = render;
addEventListener('hashchange', route); route(); render();
