import { createSheet, COLS, ROWS, colName } from './engine.js';

const STORAGE_KEY = 'spreadsheet-cells';
const sheet = createSheet();
try {
  sheet.load(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
} catch {
  // Ignore unreadable saved data.
}

const grid = document.getElementById('grid');
const formula = document.getElementById('formula');
const selectedLabel = document.getElementById('selected');
const cells = new Map();
let selected = 'A1';
let clipboard = null;

function buildGrid() {
  const head = grid.createTHead().insertRow();
  head.appendChild(document.createElement('th'));
  for (let c = 0; c < COLS; c++) {
    const th = document.createElement('th');
    th.textContent = colName(c);
    head.appendChild(th);
  }
  const body = grid.createTBody();
  for (let r = 1; r <= ROWS; r++) {
    const tr = body.insertRow();
    const th = document.createElement('th');
    th.textContent = r;
    tr.appendChild(th);
    for (let c = 0; c < COLS; c++) {
      const ref = colName(c) + r;
      const td = tr.insertCell();
      td.dataset.ref = ref;
      cells.set(ref, td);
    }
  }
}

function render() {
  for (const [ref, td] of cells) {
    const text = sheet.display(ref);
    td.textContent = text;
    td.classList.toggle('number', typeof sheet.get(ref) === 'number');
    td.classList.toggle('selected', ref === selected);
  }
}

function select(ref) {
  cells.get(selected)?.classList.remove('selected');
  selected = ref;
  cells.get(ref).classList.add('selected');
  selectedLabel.textContent = ref;
  formula.value = sheet.raw(ref);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sheet.dump()));
}

function changed() {
  save();
  render();
  formula.value = sheet.raw(selected);
}

buildGrid();
render();
select('A1');

grid.addEventListener('click', (e) => {
  const td = e.target.closest('td[data-ref]');
  if (!td) return;
  select(td.dataset.ref);
  formula.focus();
});

formula.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  sheet.set(selected, formula.value);
  changed();
  const row = parseInt(selected.slice(1), 10);
  if (row < ROWS) select(selected[0] + (row + 1));
});

document.getElementById('undo').addEventListener('click', () => { sheet.undo(); changed(); });
document.getElementById('redo').addEventListener('click', () => { sheet.redo(); changed(); });
document.getElementById('copy').addEventListener('click', () => { clipboard = selected; });
document.getElementById('paste').addEventListener('click', () => {
  if (!clipboard) return;
  sheet.copy(clipboard, selected);
  changed();
});
document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([sheet.toCSV()], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sheet.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
