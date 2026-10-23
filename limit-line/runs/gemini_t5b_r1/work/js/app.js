// js/app.js
import { createSheet } from "./engine.js";

const COLS = 10; // A to J
const ROWS = 30; // 1 to 30
const STORAGE_KEY = "spreadsheet_raw_cells_v1";

const sheet = createSheet();

const gridEl = document.getElementById("grid");
const formulaInput = document.getElementById("formula");
const selectedRefBadge = document.getElementById("selected-ref");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const copyBtn = document.getElementById("copy");
const pasteBtn = document.getElementById("paste");
const exportBtn = document.getElementById("export");

let selectedRef = "A1";
let copiedRef = null;

// Map of "A1" -> td element for fast updates
const cellElements = new Map();

function colToLetter(c) {
  return String.fromCharCode(65 + c);
}

function parseRefCoords(ref) {
  const col = ref.charCodeAt(0) - 65;
  const row = Number(ref.slice(1));
  return { col, row };
}

function buildGrid() {
  gridEl.innerHTML = "";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const cornerTh = document.createElement("th");
  cornerTh.className = "corner-header";
  headerRow.appendChild(cornerTh);

  for (let c = 0; c < COLS; c++) {
    const th = document.createElement("th");
    th.textContent = colToLetter(c);
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  gridEl.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (let r = 1; r <= ROWS; r++) {
    const tr = document.createElement("tr");
    const rowTh = document.createElement("th");
    rowTh.textContent = String(r);
    tr.appendChild(rowTh);

    for (let c = 0; c < COLS; c++) {
      const ref = `${colToLetter(c)}${r}`;
      const td = document.createElement("td");
      td.setAttribute("data-ref", ref);
      td.addEventListener("click", () => {
        selectCell(ref, true);
      });
      tr.appendChild(td);
      cellElements.set(ref, td);
    }
    tbody.appendChild(tr);
  }
  gridEl.appendChild(tbody);
}

function saveToStorage() {
  try {
    const data = {};
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ref = `${colToLetter(c)}${r}`;
        const raw = sheet.raw(ref);
        if (raw !== "") {
          data[ref] = raw;
        }
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // Ignore storage quota or private browsing errors
  }
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const data = JSON.parse(saved);
    if (data && typeof data === "object") {
      if (typeof sheet._loadBulk === "function") {
        sheet._loadBulk(data);
      } else {
        for (const [ref, raw] of Object.entries(data)) {
          if (typeof raw === "string" && raw !== "") {
            sheet.set(ref, raw);
          }
        }
      }
    }
  } catch (err) {
    // Ignore parse errors
  }
}

function renderGrid() {
  for (let r = 1; r <= ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ref = `${colToLetter(c)}${r}`;
      const td = cellElements.get(ref);
      if (!td) continue;
      const disp = sheet.display(ref);
      td.textContent = disp;
      if (disp.startsWith("#") && (disp.endsWith("!") || disp.endsWith("?"))) {
        td.classList.add("error-cell");
      } else {
        td.classList.remove("error-cell");
      }
    }
  }
}

function selectCell(ref, focusFormula = false) {
  const prevTd = cellElements.get(selectedRef);
  if (prevTd) {
    prevTd.classList.remove("selected");
  }
  selectedRef = ref;
  const nextTd = cellElements.get(selectedRef);
  if (nextTd) {
    nextTd.classList.add("selected");
  }
  if (selectedRefBadge) {
    selectedRefBadge.textContent = selectedRef;
  }
  formulaInput.value = sheet.raw(selectedRef);
  if (focusFormula) {
    formulaInput.focus();
  }
}

function commitFormulaInput() {
  const newRaw = formulaInput.value;
  sheet.set(selectedRef, newRaw);
  saveToStorage();
  renderGrid();

  // Move selection one row down (clamp at row 30)
  const { col, row } = parseRefCoords(selectedRef);
  const nextRow = Math.min(ROWS, row + 1);
  const nextRef = `${colToLetter(col)}${nextRow}`;
  selectCell(nextRef, true);
}

formulaInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    commitFormulaInput();
  }
});

undoBtn.addEventListener("click", () => {
  sheet.undo();
  saveToStorage();
  renderGrid();
  formulaInput.value = sheet.raw(selectedRef);
});

redoBtn.addEventListener("click", () => {
  sheet.redo();
  saveToStorage();
  renderGrid();
  formulaInput.value = sheet.raw(selectedRef);
});

copyBtn.addEventListener("click", () => {
  if (copiedRef) {
    const prevCopied = cellElements.get(copiedRef);
    if (prevCopied) prevCopied.classList.remove("copied");
  }
  copiedRef = selectedRef;
  const curCopied = cellElements.get(copiedRef);
  if (curCopied) curCopied.classList.add("copied");
});

pasteBtn.addEventListener("click", () => {
  if (!copiedRef) return;
  sheet.copy(copiedRef, selectedRef);
  saveToStorage();
  renderGrid();
  formulaInput.value = sheet.raw(selectedRef);
});

exportBtn.addEventListener("click", () => {
  const csvContent = sheet.toCSV();
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "spreadsheet.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Initialize
buildGrid();
loadFromStorage();
renderGrid();
selectCell("A1", false);
