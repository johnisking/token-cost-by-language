import { createSheet } from "./engine.js";

const sheet = createSheet();
const grid = document.querySelector("#grid");
const formula = document.querySelector("#formula");
const nameBox = document.querySelector("#name-box");
let selected = "A1", copied = null;
const storageKey = "small-sheet-v1";

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
  if (Array.isArray(saved)) sheet._load(saved);
} catch { /* Ignore malformed local data. */ }

function render() {
  const rows = ["<thead><tr><th></th>"];
  for (let c=0;c<10;c++) rows.push(`<th>${String.fromCharCode(65+c)}</th>`);
  rows.push("</tr></thead><tbody>");
  for (let r=1;r<=30;r++) {
    rows.push(`<tr><th>${r}</th>`);
    for(let c=0;c<10;c++) {
      const ref=String.fromCharCode(65+c)+r;
      rows.push(`<td data-ref="${ref}" class="${ref===selected?"selected":""}">${escapeHtml(sheet.display(ref))}</td>`);
    }
    rows.push("</tr>");
  }
  rows.push("</tbody>");
  grid.innerHTML=rows.join("");
  nameBox.textContent=selected;
  formula.value=sheet.raw(selected);
  document.querySelector("#undo").disabled=!sheet.canUndo;
  document.querySelector("#redo").disabled=!sheet.canRedo;
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
function persist() { try { localStorage.setItem(storageKey,JSON.stringify(sheet._entries())); } catch { /* Storage may be unavailable. */ } }
function refresh() { render(); }

grid.addEventListener("click",event=>{
  const cell=event.target.closest("td[data-ref]");if(!cell)return;
  selected=cell.dataset.ref;refresh();formula.focus();formula.select();
});
formula.addEventListener("keydown",event=>{
  if(event.key!=="Enter")return;
  event.preventDefault();const row=Number(selected.slice(1));
  sheet.set(selected,formula.value);persist();selected=selected[0]+Math.min(30,row+1);refresh();formula.focus();formula.select();
});
document.querySelector("#undo").addEventListener("click",()=>{if(sheet.undo()){persist();refresh();}});
document.querySelector("#redo").addEventListener("click",()=>{if(sheet.redo()){persist();refresh();}});
document.querySelector("#copy").addEventListener("click",()=>{copied=selected;});
document.querySelector("#paste").addEventListener("click",()=>{if(copied){sheet.copy(copied,selected);persist();refresh();}});
document.querySelector("#export").addEventListener("click",()=>{
  const blob=new Blob([sheet.toCSV()],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download="spreadsheet.csv";link.click();URL.revokeObjectURL(url);
});

render();
