import { createSheet } from './engine.js';

const COLS = 'ABCDEFGHIJ';
const KEY = 'sheet5b_raws';
const sheet = createSheet();
try { sheet._load(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}

const grid = document.getElementById('grid');
const formula = document.getElementById('formula');
let selected = 'A1';
let clip = null;

function save() { try { localStorage.setItem(KEY, JSON.stringify(sheet._raws())); } catch {} }

function build() {
  const head = document.createElement('tr');
  head.appendChild(document.createElement('th'));
  for (const c of COLS) { const th = document.createElement('th'); th.textContent = c; head.appendChild(th); }
  grid.appendChild(head);
  for (let r = 1; r <= 30; r++) {
    const tr = document.createElement('tr');
    const th = document.createElement('th'); th.textContent = r; tr.appendChild(th);
    for (const c of COLS) {
      const td = document.createElement('td'); td.dataset.ref = c + r;
      td.addEventListener('click', () => select(c + r));
      tr.appendChild(td);
    }
    grid.appendChild(tr);
  }
}
function render() {
  for (const td of grid.querySelectorAll('td[data-ref]')) {
    td.textContent = sheet.display(td.dataset.ref);
    td.classList.toggle('selected', td.dataset.ref === selected);
  }
}
function select(ref) { selected = ref; formula.value = sheet.raw(ref); render(); }

formula.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  sheet.set(selected, formula.value); save();
  const col = selected[0], row = Number(selected.slice(1));
  select(col + Math.min(30, row + 1));
});
document.getElementById('undo').addEventListener('click', () => { sheet.undo(); save(); select(selected); });
document.getElementById('redo').addEventListener('click', () => { sheet.redo(); save(); select(selected); });
document.getElementById('copy').addEventListener('click', () => { clip = selected; });
document.getElementById('paste').addEventListener('click', () => { if (clip) { sheet.copy(clip, selected); save(); select(selected); } });
document.getElementById('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([sheet.toCSV()], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = 'sheet.csv'; document.body.appendChild(a); a.click(); a.remove();
});
build(); select('A1');
