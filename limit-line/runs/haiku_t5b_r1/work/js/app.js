import { createSheet, ROWS } from './engine.js';

const STORAGE_KEY = 'mini-sheet-cells';
const COLUMNS = 'ABCDEFGHIJ';

const sheet = createSheet();
const grid = document.getElementById('grid');
const formula = document.getElementById('formula');
const address = document.getElementById('address');

let selected = 'A1';
let copied = null;

function buildGrid() {
  const head = grid.createTHead().insertRow();
  head.appendChild(document.createElement('th'));
  for (const col of COLUMNS) {
    const th = document.createElement('th');
    th.textContent = col;
    head.appendChild(th);
  }
  const body = grid.createTBody();
  for (let row = 1; row <= ROWS; row++) {
    const tr = body.insertRow();
    const th = document.createElement('th');
    th.textContent = row;
    tr.appendChild(th);
    for (const col of COLUMNS) {
      const td = document.createElement('td');
      td.dataset.ref = col + row;
      tr.appendChild(td);
    }
  }
}

function render() {
  for (const td of grid.querySelectorAll('td[data-ref]')) {
    const ref = td.dataset.ref;
    td.textContent = sheet.display(ref);
    td.classList.toggle('num', typeof sheet.get(ref) === 'number');
    td.classList.toggle('copied', ref === copied);
    td.classList.toggle('selected', ref === selected);
  }
}

function showSelection() {
  address.textContent = selected;
  formula.value = sheet.raw(selected);
}

// Called after any change to the cells: redraw, refresh the formula bar, and save.
function changed() {
  render();
  showSelection();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sheet.entries()));
}

function select(ref) {
  selected = ref;
  render();
  showSelection();
}

grid.addEventListener('click', (event) => {
  const td = event.target.closest('td[data-ref]');
  if (td) select(td.dataset.ref);
});

formula.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  sheet.set(selected, formula.value);
  const row = Number(selected.slice(1));
  if (row < ROWS) selected = selected[0] + (row + 1);
  changed();
});

document.getElementById('undo').addEventListener('click', () => {
  sheet.undo();
  changed();
});

document.getElementById('redo').addEventListener('click', () => {
  sheet.redo();
  changed();
});

document.getElementById('copy').addEventListener('click', () => {
  copied = selected;
  render();
});

document.getElementById('paste').addEventListener('click', () => {
  if (!copied) return;
  sheet.copy(copied, selected);
  changed();
});

document.getElementById('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([sheet.toCSV()], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'spreadsheet.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

buildGrid();
try {
  sheet.load(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'));
} catch {
  // Ignore saved data that is not valid JSON.
}
render();
showSelection();
