import { parseCSV, toCSV } from './csv.js';
import { summarize } from './summary.js';
import { expandRecurring } from './recurring.js';
import { checkBudgets } from './budget.js';
import { createHistory } from './history.js';

const $ = id => document.getElementById(id);
const today = new Date().toISOString().slice(0, 10);
const monthNow = today.slice(0, 7);
const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let transactions = load('clearledger-transactions', []), budgets = load('clearledger-budgets', []);
const history = createHistory(transactions);
let amountDescending = false;
$('date').value = today; $('until').value = today; $('budget-month').value = monthNow; $('report-month').value = monthNow;

function persist() {
  localStorage.setItem('clearledger-transactions', JSON.stringify(transactions));
  localStorage.setItem('clearledger-budgets', JSON.stringify(budgets));
}
function money(n) { return Number(n || 0).toFixed(2); }
function renderTransactions() {
  $('balance').textContent = money(summarize(transactions).balance);
  const query = $('search').value.trim().toLowerCase();
  const shown = transactions.map((item, index) => ({ item, index })).filter(x => x.item.description.toLowerCase().includes(query));
  if (amountDescending) shown.sort((a, b) => Number(b.item.amount) - Number(a.item.amount));
  $('list').replaceChildren(...shown.map(({item,index}) => {
    const tr = document.createElement('tr');
    const values = [item.date, item.description, money(item.amount), item.category];
    values.forEach((v, i) => { const td = document.createElement('td'); td.textContent = v; if (i === 2) td.className = `amount ${Number(item.amount) < 0 ? 'negative' : ''}`; tr.append(td); });
    const td = document.createElement('td'), del = document.createElement('button'); del.className = 'delete'; del.textContent = '×'; del.title = 'Delete transaction'; del.onclick = () => { const next = transactions.slice(); next.splice(index, 1); commit(next); }; td.append(del); tr.append(td); return tr;
  }));
  $('empty-state').hidden = shown.length > 0;
  $('undo').disabled = !history.canUndo(); $('redo').disabled = !history.canRedo();
  renderBudgets(); renderReports();
}
function commit(next) { history.push(next); transactions = next; persist(); renderTransactions(); }
function renderBudgets() {
  const month = $('budget-month').value || monthNow, result = checkBudgets(transactions, budgets, month);
  $('budgets').replaceChildren(...result.map(b => { const tr = document.createElement('tr'); if (b.over) tr.className = 'over'; [b.category, money(b.limit), money(b.spent)].forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.append(td); }); const td = document.createElement('td'), del = document.createElement('button'); del.className = 'delete'; del.textContent = '×'; del.onclick = () => { budgets.splice(budgets.indexOf(budgets.find(x => x.category === b.category)), 1); persist(); renderBudgets(); }; td.append(del); tr.append(td); return tr; }));
  $('budget-empty').hidden = result.length > 0;
}
function renderReports() {
  const month = $('report-month').value || monthNow, start = `${month}-01`, end = `${month}-31`;
  const cats = summarize(transactions, {from:start,to:end}).byCategory;
  const entries = Object.entries(cats).sort(([a],[b]) => a.localeCompare(b));
  $('report').replaceChildren(...entries.map(([cat,total]) => { const tr=document.createElement('tr'); [cat,money(total)].forEach(x=>{const td=document.createElement('td');td.textContent=x;tr.append(td)});return tr; }));
  $('report-empty').hidden = entries.length > 0;
  drawChart(entries.filter(([,v])=>v<0).map(([cat,v])=>[cat,-v]));
}
function drawChart(data) {
  const canvas=$('chart'), ctx=canvas.getContext('2d'), rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  canvas.width=Math.max(1,rect.width*dpr); canvas.height=Math.max(1,rect.height*dpr); ctx.scale(dpr,dpr); ctx.clearRect(0,0,rect.width,rect.height);
  $('chart-empty').hidden=data.length>0; if(!data.length)return;
  const max=Math.max(...data.map(x=>x[1])), gap=16, width=(rect.width-gap*(data.length+1))/data.length;
  data.forEach(([label,value],i)=>{const h=(value/max)*(rect.height-45), x=gap+i*(width+gap), y=rect.height-28-h;ctx.fillStyle='#397556';ctx.beginPath();ctx.roundRect(x,y,width,h,4);ctx.fill();ctx.fillStyle='#748078';ctx.font='10px DM Sans, sans-serif';ctx.textAlign='center';ctx.fillText(label.slice(0,12),x+width/2,rect.height-10);});
}
function route() {
  const route = location.hash || '#/transactions';
  const active = ['transactions','budgets','reports'].find(v=>route===`#/${v}`) || 'transactions';
  ['transactions','budgets','reports'].forEach(v=>{ $(`view-${v}`).hidden=v!==active; $(`nav-${v}`).classList.toggle('active',v===active); });
  if(active==='reports') renderReports();
}
window.addEventListener('hashchange', route); window.addEventListener('resize', renderReports);
$('add').onclick = () => {
  const date=$('date').value, description=$('description').value.trim(), amount=Number($('amount').value), category=$('category').value.trim();
  if(!date||!description||!Number.isFinite(amount)||$('amount').value===''||!category)return;
  const rule={date,description,amount,category,every:$('repeat').value};
  const additions=rule.every==='none'?[{date,description,amount,category}]:expandRecurring(rule,$('until').value||date);
  commit([...transactions,...additions]); $('description').value=''; $('amount').value=''; $('description').focus();
};
$('search').oninput=renderTransactions; $('sort-amount').onclick=()=>{amountDescending=!amountDescending;renderTransactions()};
$('undo').onclick=()=>{transactions=history.undo();persist();renderTransactions()}; $('redo').onclick=()=>{transactions=history.redo();persist();renderTransactions()};
$('import-trigger').onclick=()=>$('import').click(); $('import').onchange=async e=>{const file=e.target.files[0];if(file){try{commit([...transactions,...parseCSV(await file.text())])}catch{alert('Could not read that CSV file.')}e.target.value=''}};
$('export').onclick=()=>{const blob=new Blob([toCSV(transactions)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='transactions.csv';a.click();URL.revokeObjectURL(url)};
$('budget-add').onclick=()=>{const category=$('budget-category').value.trim(),limit=Number($('budget-limit').value);if(!category||!Number.isFinite(limit)||limit<=0)return;const index=budgets.findIndex(b=>b.category.toLowerCase()===category.toLowerCase());if(index>=0)budgets[index]={category,limit};else budgets.push({category,limit});persist();$('budget-category').value='';$('budget-limit').value='';renderBudgets()};
$('budget-month').onchange=renderBudgets; $('report-month').onchange=renderReports;
renderTransactions(); route();
