import { parseCSV, toCSV } from "./csv.js";
import { summarize } from "./summary.js";

const STORAGE_KEY = "expense-tracker-transactions";
const form = document.querySelector("#transaction-form");
const list = document.querySelector("#list");
const balance = document.querySelector("#balance");
const filter = document.querySelector("#filter");
const importInput = document.querySelector("#import");
const status = document.querySelector("#status");
let items = loadItems();

document.querySelector("#date").value = new Date().toISOString().slice(0, 10);
form.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(form);
  const amount = Number(data.get("amount"));
  if (!Number.isFinite(amount)) { showStatus("Enter a valid amount."); return; }
  items.unshift({ date: String(data.get("date")), description: String(data.get("description")).trim(), amount, category: String(data.get("category")).trim() });
  saveAndRender();
  form.reset();
  document.querySelector("#date").value = new Date().toISOString().slice(0, 10);
  document.querySelector("#description").focus();
  showStatus("");
});

list.addEventListener("click", event => {
  const button = event.target.closest("button.delete");
  if (!button) return;
  items.splice(Number(button.dataset.index), 1);
  saveAndRender();
});
filter.addEventListener("change", render);
window.addEventListener("resize", drawChart);

document.querySelector("#export").addEventListener("click", () => {
  const blob = new Blob(["\uFEFF", toCSV(items)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "transactions.csv";
  link.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  try {
    const imported = parseCSV(await file.text());
    items.push(...imported);
    saveAndRender();
    showStatus(`Imported ${imported.length} transaction${imported.length === 1 ? "" : "s"}.`);
  } catch (error) {
    showStatus(error.message || "Could not read that CSV file.");
  } finally { importInput.value = ""; }
});

function loadItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(item => item && typeof item === "object" && Number.isFinite(Number(item.amount))) : [];
  } catch { return []; }
}
function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  render();
}
function showStatus(message) { status.textContent = message; }
function render() {
  const categories = [...new Set(items.map(item => String(item.category ?? "")).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const selected = filter.value;
  filter.replaceChildren(new Option("All", "All"), ...categories.map(category => new Option(category, category)));
  filter.value = categories.includes(selected) ? selected : "All";
  const visible = items.map((item, index) => ({ item, index })).filter(({ item }) => filter.value === "All" || item.category === filter.value);
  list.replaceChildren(...visible.map(({ item, index }) => {
    const tr = document.createElement("tr");
    const date = document.createElement("td"); date.textContent = item.date || "";
    const description = document.createElement("td"); description.textContent = item.description || "";
    const category = document.createElement("td"); category.textContent = item.category || "";
    const amount = document.createElement("td"); amount.className = `amount ${Number(item.amount) >= 0 ? "positive" : "negative"}`; amount.textContent = Number(item.amount).toFixed(2);
    const action = document.createElement("td");
    const button = document.createElement("button"); button.type = "button"; button.className = "delete"; button.dataset.index = String(index); button.textContent = "Delete"; button.setAttribute("aria-label", `Delete ${item.description || "transaction"}`);
    action.append(button); tr.append(date, description, category, amount, action); return tr;
  }));
  document.querySelector("#empty-state").hidden = visible.length > 0;
  balance.textContent = summarize(items).balance.toFixed(2);
  drawChart();
}
function drawChart() {
  const canvas = document.querySelector("#chart");
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio);
  const width = rect.width, height = rect.height;
  ctx.clearRect(0, 0, width, height);
  const expenseTotals = new Map();\n  for (const item of items) {\n    const amount = Number(item.amount) || 0;\n    if (amount < 0) {\n      const category = item.category || "Uncategorized";\n      expenseTotals.set(category, (expenseTotals.get(category) || 0) + Math.abs(amount));\n    }\n  }\n  const expenses = [...expenseTotals].sort((a, b) => b[1] - a[1]);
  if (!expenses.length) {
    ctx.fillStyle = "#89938a"; ctx.font = "13px system-ui"; ctx.textAlign = "center"; ctx.fillText("Add an expense to see category spending", width / 2, height / 2 + 4); return;
  }
  const max = Math.max(...expenses.map(([, amount]) => amount));
  const left = 12, right = 12, top = 16, bottom = 40, plotHeight = height - top - bottom;
  const slot = (width - left - right) / expenses.length, barWidth = Math.min(46, slot * .56);
  expenses.forEach(([name, value], index) => {
    const x = left + slot * index + (slot - barWidth) / 2, barHeight = Math.max(3, plotHeight * value / max), y = top + plotHeight - barHeight;
    ctx.fillStyle = "#43815e"; ctx.beginPath(); ctx.roundRect(x, y, barWidth, barHeight, 4); ctx.fill();
    ctx.fillStyle = "#526158"; ctx.font = "11px system-ui"; ctx.textAlign = "center";
    ctx.fillText(value.toFixed(2), x + barWidth / 2, Math.max(11, y - 5));
    const label = name.length > 14 ? `${name.slice(0, 12)}…` : name;
    ctx.fillStyle = "#788279"; ctx.fillText(label, x + barWidth / 2, height - 13);
  });
}
render();

