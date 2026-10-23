import { parseCSV, toCSV } from './csv.js'; import { summarize } from './summary.js'; import { load, save } from './store.js';
let items = load(); const $ = s => document.querySelector(s);
function render() {
  const f = $('#filter').value || 'All'; const cats = [...new Set(items.map(i => i.category))];
  $('#filter').innerHTML = '<option value="All">All</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join(''); $('#filter').value = cats.includes(f) ? f : 'All';
  const tb = $('#list tbody'); tb.innerHTML = '';
  items.forEach((i, idx) => { if ($('#filter').value !== 'All' && i.category !== $('#filter').value) return;
    const tr = document.createElement('tr'); tr.innerHTML = `<td>${i.date}</td><td></td><td>${i.amount.toFixed(2)}</td><td>${i.category}</td><td><button class="delete">Delete</button></td>`;
    tr.children[1].textContent = i.description; tr.querySelector('.delete').onclick = () => { items.splice(idx, 1); save(items); render(); }; tb.appendChild(tr); });
  const s = summarize(items); $('#balance').textContent = s.balance.toFixed(2);
  const c = $('#chart').getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 400, 200); c.fillStyle = '#e44';
  const ex = Object.entries(s.byCategory).filter(([, v]) => v < 0); const mx = Math.max(1, ...ex.map(([, v]) => -v));
  ex.forEach(([k, v], j) => c.fillRect(10 + j * 60, 190 - (-v / mx) * 170, 40, (-v / mx) * 170));
}
$('#add').onclick = () => { items.push({ date: $('#date').value, description: $('#description').value, amount: Number($('#amount').value), category: $('#category').value }); save(items); render(); };
$('#filter').onchange = render;
$('#import').onchange = async e => { const t = await e.target.files[0].text(); items.push(...parseCSV(t)); save(items); render(); };
$('#export').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toCSV(items)], { type: 'text/csv' })); a.download = 'expenses.csv'; a.click(); };
render();
