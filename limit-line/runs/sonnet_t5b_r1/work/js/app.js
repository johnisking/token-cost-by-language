import { createSheet } from './engine.js';

const KEY = 'spreadsheet.raw';
const COLS = 10;
const ROWS = 30;
const sheet = createSheet();
const refs = [];
for (let r = 1; r <= ROWS; r++) for (let c = 1; c <= COLS; c++) refs.push(String.fromCharCode(64 + c) + r);

try {
  sheet.load(JSON.parse(localStorage.getItem(KEY) || '{}'));
} catch (e) { /* ignore corrupt storage */ }

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
    th.textContent = String.fromCharCode(64 + c);
    head.appendChild(th);
  }
  const body = grid.createTBody();
  for (let r = 1; r <= ROWS; r++) {
    const tr = body.insertRow();
    const th = document.createElement('th');
    th.textContent = r;
    tr.appendChild(th);
    for (let c = 1; c <= COLS; c++) {
      const ref = String.fromCharCode(64 + c) + r;
      const td = tr.insertCell();
      td.dataset.ref = ref;
      tds.set(ref, td);
    }
  }
}

function render() {
  for (const ref of refs) {
    const td = tds.get(ref);
    td.textContent = sheet.display(ref);
    td.classList.toggle('selected', ref === selected);
  }
  formula.value = sheet.raw(selected);
}

function save() {
  const out = {};
  for (const ref of refs) {
    const raw = sheet.raw(ref);
    if (raw !== '') out[ref] = raw;
  }
  try { localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) { /* ignore */ }
}

function select(ref) {
  selected = ref;
  render();
}

function change(fn) {
  fn();
  save();
  render();
}

grid.addEventListener('click', (e) => {
  const td = e.target.closest('td[data-ref]');
  if (td) select(td.dataset.ref);
});

formula.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  sheet.set(selected, formula.value);
  const m = /^([A-J])(\d+)$/.exec(selected);
  const row = Math.min(ROWS, Number(m[2]) + 1);
  selected = m[1] + row;
  save();
  render();
});

document.getElementById('undo').addEventListener('click', () => change(() => sheet.undo()));
document.getElementById('redo').addEventListener('click', () => change(() => sheet.redo()));
document.getElementById('copy').addEventListener('click', () => { copied = selected; });
document.getElementById('paste').addEventListener('click', () => {
  if (copied) change(() => sheet.copy(copied, selected));
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

build();
render();
