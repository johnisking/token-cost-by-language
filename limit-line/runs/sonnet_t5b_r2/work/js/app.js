import { createSheet } from './engine.js';

const COLS = 10;
const ROWS = 30;
const STORE_KEY = 'spreadsheet.cells.v1';
const letter = (c) => String.fromCharCode(64 + c);

const sheet = createSheet();
try {
  sheet.load(JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
} catch { /* ignore corrupt storage */ }

const grid = document.getElementById('grid');
const formula = document.getElementById('formula');
const tds = new Map();
let selected = 'A1';
let copied = null;

function build() {
  const head = grid.createTHead().insertRow();
  head.appendChild(document.createElement('th'));
  for (let c = 1; c <= COLS; c++) {
    const th = document.createElement('th');
    th.textContent = letter(c);
    head.appendChild(th);
  }
  const body = grid.createTBody();
  for (let r = 1; r <= ROWS; r++) {
    const tr = body.insertRow();
    const th = document.createElement('th');
    th.textContent = r;
    tr.appendChild(th);
    for (let c = 1; c <= COLS; c++) {
      const ref = letter(c) + r;
      const td = tr.insertCell();
      td.dataset.ref = ref;
      tds.set(ref, td);
    }
  }
}

function refresh() {
  for (const [ref, td] of tds) {
    td.textContent = sheet.display(ref);
    td.classList.toggle('num', typeof sheet.get(ref) === 'number');
    td.classList.toggle('err', /^#/.test(td.textContent) && typeof sheet.get(ref) === 'string' && sheet.raw(ref)[0] === '=');
  }
  formula.value = sheet.raw(selected);
  document.getElementById('undo').disabled = !sheet.canUndo();
  document.getElementById('redo').disabled = !sheet.canRedo();
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(sheet.snapshot())); } catch { /* quota */ }
}

function select(ref) {
  tds.get(selected)?.classList.remove('selected');
  selected = ref;
  tds.get(ref).classList.add('selected');
  formula.value = sheet.raw(ref);
}

function changed() {
  save();
  refresh();
}

build();
select('A1');
refresh();

grid.addEventListener('click', (e) => {
  const td = e.target.closest('td[data-ref]');
  if (td) select(td.dataset.ref);
});

formula.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  sheet.set(selected, formula.value);
  const m = /^([A-J])(\d+)$/.exec(selected);
  const next = Math.min(ROWS, parseInt(m[2], 10) + 1);
  changed();
  select(m[1] + next);
});

document.getElementById('undo').addEventListener('click', () => { sheet.undo(); changed(); });
document.getElementById('redo').addEventListener('click', () => { sheet.redo(); changed(); });
document.getElementById('copy').addEventListener('click', () => { copied = selected; });
document.getElementById('paste').addEventListener('click', () => {
  if (!copied) return;
  sheet.copy(copied, selected);
  changed();
});
document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([sheet.toCSV()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sheet.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
