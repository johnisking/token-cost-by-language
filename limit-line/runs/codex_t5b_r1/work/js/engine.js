const COLS = 10, ROWS = 30;
const ERRORS = new Set(["#DIV/0!", "#REF!", "#NAME?", "#VALUE!", "#CYCLE!", "#ERROR!"]);
const err = v => typeof v === "string" && ERRORS.has(v);
function address(ref) {
  const m = /^\$?([A-J])\$?([1-9]|[12]\d|30)$/i.exec(ref);
  return m ? { c: m[1].toUpperCase().charCodeAt(0) - 65, r: +m[2] - 1 } : null;
}
const key = (c,r) => String.fromCharCode(65+c)+(r+1);
function format(n) {
  if (!Number.isFinite(n)) return "#ERROR!";
  if (Object.is(n,-0)) n=0;
  return String(Number(n.toFixed(10)));
}

function tokenize(s) {
  const out=[]; let i=0;
  while(i<s.length) {
    if (/\s/.test(s[i])) { i++; continue; }
    const rest=s.slice(i);
    let m;
    if (s[i] === '"') {
      i++; let v="", closed=false;
      while(i<s.length) { if(s[i]==='"') { if(s[i+1]==='"'){v+='"';i+=2;} else {i++;closed=true;break;} } else v+=s[i++]; }
      if(!closed) throw Error(); out.push({t:"str",v}); continue;
    }
    if ((m=/^\$?[A-Z]{1,3}\$?\d+/i.exec(rest))) { out.push({t:"ref",v:m[0]});i+=m[0].length;continue; }
    if ((m=/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest))) { out.push({t:"num",v:+m[0]});i+=m[0].length;continue; }
    if ((m=/^(?:<=|>=|<>|[=<>+\-*/^&(),:])/i.exec(rest))) {out.push({t:m[0]});i+=m[0].length;continue;}
    if ((m=/^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) { const u=m[0].toUpperCase();out.push({t:u==="TRUE"||u==="FALSE"?"bool":"name",v:u});i+=m[0].length;continue; }
    throw Error();
  }
  out.push({t:"eof"}); return out;
}
const PREC={"=":1,"<>":1,"<":1,">":1,"<=":1,">=":1,"&":2,"+":3,"-":3,"*":4,"/":4,"^":6};
function parse(src) {
  const ts=tokenize(src);let p=0;const peek=()=>ts[p], take=()=>ts[p++];
  function expr(min=0) {
    let t=take(), left;
    if(t.t==="num"||t.t==="str") left={k:t.t,v:t.v};
    else if(t.t==="bool") left={k:"bool",v:t.v==="TRUE"};
    else if(t.t==="ref") left={k:"ref",v:t.v};
    else if(t.t==="+"||t.t==="-") left={k:"un",op:t.t,a:expr(5)};
    else if(t.t==="("){left=expr();if(take().t!==")")throw Error();}
    else if(t.t==="name") { if(take().t!=="(")throw Error();const args=[];if(peek().t!==")") {do {args.push(expr());if(peek().t!==",")break;take();}while(true);}if(take().t!==")")throw Error();left={k:"call",name:t.v,args}; }
    else throw Error();
    while(true) {
      if(peek().t===":" && left.k==="ref") { if(7<min)break;take();const r=take();if(r.t!=="ref")throw Error();left={k:"range",a:left.v,b:r.v};continue; }
      const op=peek().t, pr=PREC[op];if(pr===undefined||pr<min)break;take();const right=expr(pr+(op==="^"?0:1));left={k:"bin",op,a:left,b:right};
    }
    return left;
  }
  const ast=expr();if(peek().t!=="eof")throw Error();return ast;
}
const isErr = x => typeof x === "string" && ERRORS.has(x);
function comparable(a,b,op) {
  if(isErr(a))return a;if(isErr(b))return b;
  if(op==="="||op==="<>") {
    let same;
    if(typeof a==="number"&&typeof b==="number")same=a===b;
    else if(typeof a==="string"&&typeof b==="string")same=a.toLowerCase()===b.toLowerCase();
    else same=false;
    return op==="="?same:!same;
  }
  if(typeof a!==typeof b||!(typeof a==="number"||typeof a==="string"))return "#VALUE!";
  if(typeof a==="string"){a=a.toLowerCase();b=b.toLowerCase();}
  return op==="<"?a<b:op===">"?a>b:op==="<="?a<=b:a>=b;
}
export function createSheet() {
  const raws=new Map();let history=[],cursor=0,cache=new Map(),stack=[],cycles=new Set();
  const validate=ref=>{const a=address(ref);return a?key(a.c,a.r):null;};
  function raw(ref){const k=validate(ref);return k?raws.get(k)||"":"";}
  function evaluateAst(ast) {
    const ev=node=>{
      if(node.k==="num"||node.k==="str"||node.k==="bool")return node.v;
      if(node.k==="ref")return read(node.v);
      if(node.k==="range") {const a=address(node.a),b=address(node.b);if(!a||!b)return "#REF!";const vals=[];for(let r=Math.min(a.r,b.r);r<=Math.max(a.r,b.r);r++)for(let c=Math.min(a.c,b.c);c<=Math.max(a.c,b.c);c++)vals.push(read(key(c,r)));return {range:true,vals};}
      if(node.k==="un") {let v=ev(node.a);if(isErr(v))return v; if(v==="")v=0;if(typeof v==="boolean")v=+v;if(typeof v!=="number")return "#VALUE!";return node.op==="-"?-v:v;}
      if(node.k==="bin") {let a=ev(node.a);if(a?.range)a="#VALUE!";if(isErr(a))return a;let b=ev(node.b);if(b?.range)b="#VALUE!";if(isErr(b))return b;
        if(node.op==="="||node.op==="<>"||node.op==="<"||node.op===">"||node.op==="<="||node.op===">=")return comparable(a,b,node.op);
        if(node.op==="&")return shown(a)+shown(b);
        const num=x=>x===""?0:typeof x==="boolean"?+x:typeof x==="number"?x:null, x=num(a),y=num(b);if(x===null||y===null)return "#VALUE!";
        if(node.op==="+")return x+y;if(node.op==="-")return x-y;if(node.op==="*")return x*y;if(node.op==="/")return y===0?"#DIV/0!":x/y;return x**y;
      }
      if(node.k==="call") {
        const name=node.name;
        if(name==="IF") {if(node.args.length<2||node.args.length>3)return "#ERROR!";const c=ev(node.args[0]);if(isErr(c))return c;return truth(c)?ev(node.args[1]):(node.args[2]?ev(node.args[2]):false);}
        if(!["ABS","ROUND","SUM","AVERAGE","MIN","MAX","COUNT"].includes(name))return "#NAME?";
        const args=node.args.map(ev);for(const v of args)if(isErr(v))return v;
        if(name==="ABS"||name==="ROUND") {if(args.length<(name==="ABS"?1:1)||args.length>(name==="ABS"?1:2))return "#ERROR!";let x=coerce(args[0]);if(x===null)return "#VALUE!";if(name==="ABS")return Math.abs(x);let d=args.length>1?coerce(args[1]):0;if(d===null)return "#VALUE!";d=Math.trunc(d);const f=10**d;return Math.sign(x)*Math.floor(Math.abs(x)*f+0.5+Number.EPSILON)/f;}
        if(!["SUM","AVERAGE","MIN","MAX","COUNT"].includes(name))return "#NAME?";
        const vals=[];for(const v of args){if(v?.range)vals.push(...v.vals);else vals.push(v);}const nums=[];for(const v of vals){if(isErr(v))return v;if(typeof v==="number")nums.push(v);}if(name==="COUNT")return nums.length;if(name==="SUM")return nums.reduce((a,b)=>a+b,0);if(name==="AVERAGE")return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:"#DIV/0!";if(!nums.length)return 0;return name==="MIN"?Math.min(...nums):Math.max(...nums);
      }
      return "#ERROR!";
    };return ev(ast);
  }
  const shown=v=>typeof v==="number"?format(v):typeof v==="boolean"?(v?"TRUE":"FALSE"):String(v);
  const truth=v=>v!==""&&v!==false&&v!==0;
  const coerce=v=>v===""?0:typeof v==="boolean"?+v:typeof v==="number"?v:null;
  function read(ref) {
    const k=validate(ref);if(!k)return "#REF!";if(cache.has(k))return cache.get(k);
    const idx=stack.indexOf(k);if(idx>=0){for(const c of stack.slice(idx))cycles.add(c);return "#CYCLE!";}
    const text=raws.get(k)||"";if(!text)return "";
    stack.push(k);let value;
    if(text[0]==="="){try{value=evaluateAst(parse(text.slice(1)));}catch{value="#ERROR!";}}
    else if(text.trim()!==""&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text.trim()))value=Number(text.trim());else value=text;
    stack.pop();if(cycles.has(k))value="#CYCLE!";cache.set(k,value);return value;
  }
  function invalidate(){cache=new Map();stack=[];cycles=new Set();}
  function set(ref,value){const k=validate(ref);if(!k)throw new Error("Invalid cell reference");const v=String(value??"");history=history.slice(0,cursor);history.push({k,old:raws.get(k)||"",value:v});if(history.length>100)history.shift();cursor=history.length;if(v)raws.set(k,v);else raws.delete(k);invalidate();}
  function shiftFormula(formula,dc,dr){let out="",i=0;while(i<formula.length){if(formula[i]==='"'){const start=i++;while(i<formula.length){if(formula[i]==='"'){if(formula[i+1]==='"'){i+=2;continue;}i++;break;}i++;}out+=formula.slice(start,i);continue;}const m=/^\$?([A-J])\$?(?:[1-9]|[12]\d|30)/i.exec(formula.slice(i));if(m){const parts=/^(\$?)([A-J])(\$?)([1-9]|[12]\d|30)$/i.exec(m[0]),nc=parts[1]?parts[2].toUpperCase().charCodeAt(0)-65:parts[2].toUpperCase().charCodeAt(0)-65+dc,nr=parts[3]?+parts[4]-1:+parts[4]-1+dr;out+=nc<0||nc>=COLS||nr<0||nr>=ROWS?"Z99":parts[1]+String.fromCharCode(65+nc)+parts[3]+(nr+1);i+=m[0].length;continue;}out+=formula[i++];}return out;}
  function copy(from,to){const a=validate(from),b=validate(to);if(!a||!b)throw new Error("Invalid cell reference");let v=raws.get(a)||"";if(v.startsWith("=")){const fa=address(a),ta=address(b);v=shiftFormula(v,ta.c-fa.c,ta.r-fa.r);}
    history=history.slice(0,cursor);history.push({k:b,old:raws.get(b)||"",value:v});if(history.length>100)history.shift();cursor=history.length;if(v)raws.set(b,v);else raws.delete(b);invalidate();}
  function restore(op,v){if(v)raws.set(op.k,v);else raws.delete(op.k);invalidate();}
  function csv(){let maxR=-1,maxC=-1;for(const [k,v] of raws){if(v){const a=address(k);maxR=Math.max(maxR,a.r);maxC=Math.max(maxC,a.c);}}if(maxR<0)return "";const rows=[];for(let r=0;r<=maxR;r++){const fields=[];for(let c=0;c<=maxC;c++){let x=shown(read(key(c,r)));if(/[",\n\r]/.test(x))x='"'+x.replace(/"/g,'""')+'"';fields.push(x);}rows.push(fields.join(","));}return rows.join("\n");}
  return {set,get:ref=>read(ref),raw,display:ref=>shown(read(ref)),copy,undo(){if(!cursor)return false;const op=history[--cursor];restore(op,op.old);return true;},redo(){if(cursor>=history.length)return false;const op=history[cursor++];restore(op,op.value);return true;},get canUndo(){return cursor>0;},get canRedo(){return cursor<history.length;},toCSV:csv,_load(entries){raws.clear();for(const [r,v]of entries){const k=validate(r);if(k&&v)raws.set(k,String(v));}history=[];cursor=0;invalidate();},_entries(){return [...raws.entries()];}};
}
