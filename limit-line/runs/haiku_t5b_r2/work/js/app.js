import { createSheet, COLUMNS, ROWS } from './engine.js';

const STORAGE_KEY = 'spreadsheet.cells';
const ERROR_TEXT = /^#(DIV\/0!|REF!|NAME\?|VALUE!|CYCLE!|ERROR!)$/;

const sheet = createSheet();
const grid = document.querySelector('#grid');
const formula = document.querySelector('#formula');
const currentRef = document.querySelector('#current-ref');

let selected = 'A1';
let copied = null;

function buildGrid() {
  const body = grid.tBodies[0];
  for (let row = 1; row <= ROWS; row++) {
    const tr = document.createElement('tr');
    const header = document.createElement('th');
    header.textContent = row;
    tr.append(header);
    for (const col of COLUMNS) {
      const td = document.createElement('td');
      td.dataset.ref = `${col}${row}`;
      tr.append(td);
    }
    body.append(tr);
  }
}

function render() {
  for (const td of grid.querySelectorAll('td[data-ref]')) {
    const ref = td.dataset.ref;
    const value = sheet.get(ref);
    td.textContent = sheet.display(ref);
    td.classList.toggle('error', ERROR_TEXT.test(value));
    td.classList.toggle('number', typeof value === 'number');
    td.classList.toggle('selected', ref === selected);
  }
  currentRef.textContent = selected;
  formula.value = sheet.raw(selected);
}

function select(ref) {
  selected = ref;
  render();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sheet.dump()));
}

function loadSaved() {
  try {
    sheet.load(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'));
  } catch {
    // Corrupt saved data: start with an empty sheet.
    sheet.load({});
  }
}

function changed() {
  save();
  render();
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
  if (row < ROWS) selected = `${selected[0]}${row + 1}`;
  changed();
});

document.querySelector('#undo').addEventListener('click', () => {
  sheet.undo();
  changed();
});

document.querySelector('#redo').addEventListener('click', () => {
  sheet.redo();
  changed();
});

document.querySelector('#copy').addEventListener('click', () => {
  copied = selected;
});

document.querySelector('#paste').addEventListener('click', () => {
  if (!copied) return;
  sheet.copy(copied, selected);
  changed();
});

document.querySelector('#export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([sheet.toCSV()], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'spreadsheet.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

buildGrid();
loadSaved();
select('A1');
