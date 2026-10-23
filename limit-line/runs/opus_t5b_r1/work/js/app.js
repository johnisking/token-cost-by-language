import { createSheet, COLS, NROWS } from "./engine.js";

const STORAGE_KEY = "spreadsheet-cells";
const ERRORS = new Set(["#DIV/0!", "#REF!", "#NAME?", "#VALUE!", "#CYCLE!", "#ERROR!"]);

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sheet.all()));
  } catch (e) {
    // storage unavailable; ignore
  }
}

const sheet = createSheet(load());
const grid = document.getElementById("grid");
const formula = document.getElementById("formula");
const refLabel = document.getElementById("selected-ref");
const tds = new Map();
let selected = "A1";
let clipboard = null;

function buildGrid() {
  const head = document.createElement("tr");
  head.appendChild(document.createElement("th"));
  for (const c of COLS) {
    const th = document.createElement("th");
    th.textContent = c;
    head.appendChild(th);
  }
  grid.appendChild(head);
  for (let r = 1; r <= NROWS; r++) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = r;
    tr.appendChild(th);
    for (const c of COLS) {
      const td = document.createElement("td");
      td.dataset.ref = c + r;
      tds.set(c + r, td);
      tr.appendChild(td);
    }
    grid.appendChild(tr);
  }
}

function render() {
  for (const [ref, td] of tds) {
    const v = sheet.get(ref);
    td.textContent = sheet.display(ref);
    td.classList.toggle("num", typeof v === "number");
    td.classList.toggle("err", typeof v === "string" && ERRORS.has(v));
    td.classList.toggle("selected", ref === selected);
    td.classList.toggle("copied", ref === clipboard);
  }
  refLabel.textContent = selected;
}

function select(ref) {
  selected = ref;
  formula.value = sheet.raw(ref);
  render();
}

function changed() {
  save();
  formula.value = sheet.raw(selected);
  render();
}

grid.addEventListener("click", (e) => {
  const td = e.target.closest("td[data-ref]");
  if (td) select(td.dataset.ref);
});

formula.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  sheet.set(selected, formula.value);
  save();
  const col = selected[0];
  const row = Number(selected.slice(1));
  select(col + Math.min(row + 1, NROWS));
});

document.getElementById("undo").addEventListener("click", () => {
  sheet.undo();
  changed();
});

document.getElementById("redo").addEventListener("click", () => {
  sheet.redo();
  changed();
});

document.getElementById("copy").addEventListener("click", () => {
  clipboard = selected;
  render();
});

document.getElementById("paste").addEventListener("click", () => {
  if (!clipboard) return;
  sheet.copy(clipboard, selected);
  changed();
});

document.getElementById("export").addEventListener("click", () => {
  const blob = new Blob([sheet.toCSV()], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sheet.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

buildGrid();
select(selected);
