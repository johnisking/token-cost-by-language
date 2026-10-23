// Reference spreadsheet engine for limit-line tier 5B (2026-10-23).
const COLS = 'ABCDEFGHIJ';
const NROWS = 30;
const ERR = new Set(['#DIV/0!', '#REF!', '#NAME?', '#VALUE!', '#CYCLE!', '#ERROR!']);
const isErr = (v) => typeof v === 'string' && ERR.has(v);

function parseRef(s) {
  const m = /^(\$?)([A-Za-z]+)(\$?)(\d+)$/.exec(s);
  if (!m) return null;
  const col = m[2].toUpperCase();
  let c = 0;
  for (const ch of col) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { absC: m[1] === '$', c: c - 1, absR: m[3] === '$', r: Number(m[4]) - 1 };
}
const inGrid = (c, r) => c >= 0 && c < COLS.length && r >= 0 && r < NROWS;
const key = (c, r) => COLS[c] + (r + 1);
function colName(c) {
  let s = '';
  c += 1;
  while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); }
  return s;
}

export function formatNumber(n) {
  if (!Number.isFinite(n)) return '#VALUE!';
  let v = Math.round(n * 1e10) / 1e10;
  if (Object.is(v, -0)) v = 0;
  let s = v.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s;
}
function show(v) {
  if (v === true) return 'TRUE';
  if (v === false) return 'FALSE';
  if (typeof v === 'number') return formatNumber(v);
  return String(v);
}

// ---------- tokenizer and parser ----------
function tokenize(src) {
  const t = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') {
      let s = ''; i++;
      for (;;) {
        if (i >= src.length) throw new Error('string');
        if (src[i] === '"') { if (src[i + 1] === '"') { s += '"'; i += 2; continue; } i++; break; }
        s += src[i++];
      }
      t.push({ k: 'str', v: s }); continue;
    }
    if (src.startsWith('#REF!', i)) { t.push({ k: 'err', v: '#REF!' }); i += 5; continue; }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
    if (num) { t.push({ k: 'num', v: Number(num[0]) }); i += num[0].length; continue; }
    const word = /^\$?[A-Za-z]+\$?\d+|^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i));
    if (word) { t.push({ k: 'word', v: word[0] }); i += word[0].length; continue; }
    const two = src.slice(i, i + 2);
    if (['<>', '<=', '>='].includes(two)) { t.push({ k: 'op', v: two }); i += 2; continue; }
    if ('+-*/^&=<>(),:'.includes(ch)) { t.push({ k: 'op', v: ch }); i++; continue; }
    throw new Error('char');
  }
  return t;
}

function parse(src) {
  const t = tokenize(src);
  let p = 0;
  const peek = () => t[p];
  const isOp = (v) => t[p] && t[p].k === 'op' && t[p].v === v;
  const eat = (v) => { if (!isOp(v)) throw new Error('expected ' + v); p++; };
  function cmp() {
    let a = cat();
    while (t[p] && t[p].k === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(t[p].v)) { const op = t[p++].v; a = { k: 'bin', op, a, b: cat() }; }
    return a;
  }
  function cat() { let a = add(); while (isOp('&')) { p++; a = { k: 'bin', op: '&', a, b: add() }; } return a; }
  function add() { let a = mul(); while (isOp('+') || isOp('-')) { const op = t[p++].v; a = { k: 'bin', op, a, b: mul() }; } return a; }
  function mul() { let a = unary(); while (isOp('*') || isOp('/')) { const op = t[p++].v; a = { k: 'bin', op, a, b: unary() }; } return a; }
  function unary() {
    if (isOp('-')) { p++; return { k: 'neg', a: unary() }; }
    if (isOp('+')) { p++; return { k: 'pos', a: unary() }; }
    return pow();
  }
  function pow() { const a = primary(); if (isOp('^')) { p++; return { k: 'bin', op: '^', a, b: unary() }; } return a; }
  function primary() {
    const tk = peek();
    if (!tk) throw new Error('end');
    if (tk.k === 'num') { p++; return { k: 'num', v: tk.v }; }
    if (tk.k === 'str') { p++; return { k: 'str', v: tk.v }; }
    if (tk.k === 'err') { p++; return { k: 'errlit', v: tk.v }; }
    if (isOp('(')) { p++; const e = cmp(); eat(')'); return e; }
    if (tk.k === 'word') {
      p++;
      const ref = parseRef(tk.v);
      if (ref) {
        if (isOp(':')) {
          p++;
          const tk2 = peek();
          const ref2 = tk2 && tk2.k === 'word' ? parseRef(tk2.v) : null;
          if (!ref2) throw new Error('range');
          p++;
          return { k: 'range', a: ref, b: ref2 };
        }
        return { k: 'ref', ref };
      }
      const name = tk.v.toUpperCase();
      if (isOp('(')) {
        p++;
        const args = [];
        if (!isOp(')')) { args.push(cmp()); while (isOp(',')) { p++; args.push(cmp()); } }
        eat(')');
        return { k: 'fn', name, args };
      }
      if (name === 'TRUE') return { k: 'bool', v: true };
      if (name === 'FALSE') return { k: 'bool', v: false };
      return { k: 'name', name };
    }
    throw new Error('unexpected');
  }
  const e = cmp();
  if (p !== t.length) throw new Error('trailing');
  return e;
}

// ---------- shifting references for copy ----------
function shiftFormula(src, dc, dr) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src[i] === '"') {
      let j = i + 1;
      while (j < src.length) { if (src[j] === '"') { if (src[j + 1] === '"') { j += 2; continue; } j++; break; } j++; }
      out += src.slice(i, j); i = j; continue;
    }
    const m = /^(\$?)([A-Za-z]+)(\$?)(\d+)(?![A-Za-z0-9_(])/.exec(src.slice(i));
    const prev = i > 0 ? src[i - 1] : '';
    if (m && !/[A-Za-z0-9_.]/.test(prev)) {
      const ref = parseRef(m[0]);
      const c = ref.absC ? ref.c : ref.c + dc;
      const r = ref.absR ? ref.r : ref.r + dr;
      out += inGrid(c, r) ? (ref.absC ? '$' : '') + colName(c) + (ref.absR ? '$' : '') + (r + 1) : '#REF!';
      i += m[0].length; continue;
    }
    out += src[i++];
  }
  return out;
}

export function createSheet() {
  let raws = {};
  const past = [];
  let future = [];
  let cache = null;

  function snapshot() { return { ...raws }; }
  function record() { past.push(snapshot()); if (past.length > 100) past.shift(); future = []; }

  function literal(raw) {
    const s = raw.trim();
    if (s === '') return '';
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return Number(s);
    return raw;
  }

  function compute() {
    cache = {};
    const state = {};
    const asts = {};
    function astOf(k) {
      if (!(k in asts)) {
        const raw = raws[k];
        try { asts[k] = parse(raw.slice(1)); } catch { asts[k] = null; }
      }
      return asts[k];
    }
    function value(k) {
      if (state[k] === 'done') return cache[k];
      if (state[k] === 'busy') throw { cycle: true };
      const raw = raws[k] || '';
      if (!raw.startsWith('=')) { state[k] = 'done'; cache[k] = literal(raw); return cache[k]; }
      state[k] = 'busy';
      let v;
      try {
        const ast = astOf(k);
        v = ast ? evaluate(ast) : '#ERROR!';
      } catch (e) {
        if (e && e.cycle) { state[k] = 'done'; cache[k] = '#CYCLE!'; throw e; }
        throw e;
      }
      if (typeof v === 'object' && v && v.range) v = '#VALUE!';
      state[k] = 'done'; cache[k] = v;
      return v;
    }
    function cell(c, r) {
      if (!inGrid(c, r)) return '#REF!';
      return value(key(c, r));
    }
    function num(v) {
      if (isErr(v)) return v;
      if (v === '') return 0;
      if (v === true) return 1;
      if (v === false) return 0;
      if (typeof v === 'number') return v;
      return '#VALUE!';
    }
    function rangeValues(n) {
      const c1 = Math.min(n.a.c, n.b.c), c2 = Math.max(n.a.c, n.b.c);
      const r1 = Math.min(n.a.r, n.b.r), r2 = Math.max(n.a.r, n.b.r);
      if (!inGrid(c1, r1) || !inGrid(c2, r2)) return '#REF!';
      const vals = [];
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) vals.push(cell(c, r));
      return vals;
    }
    function evaluate(n) {
      switch (n.k) {
        case 'num': return n.v;
        case 'str': return n.v;
        case 'bool': return n.v;
        case 'name': return '#NAME?';
        case 'errlit': return n.v;
        case 'ref': return cell(n.ref.c, n.ref.r);
        case 'range': return '#VALUE!';
        case 'neg': { const a = num(evaluate(n.a)); return isErr(a) ? a : -a; }
        case 'pos': { const a = num(evaluate(n.a)); return isErr(a) ? a : a; }
        case 'fn': return callFn(n);
        case 'bin': return binary(n);
      }
      return '#ERROR!';
    }
    function binary(n) {
      const a = evaluate(n.a);
      if (isErr(a)) return a;
      const b = evaluate(n.b);
      if (isErr(b)) return b;
      if (n.op === '&') return show(a === '' ? '' : a) + show(b === '' ? '' : b);
      if (['=', '<>', '<', '>', '<=', '>='].includes(n.op)) return compare(n.op, a, b);
      const x = num(a); if (isErr(x)) return x;
      const y = num(b); if (isErr(y)) return y;
      switch (n.op) {
        case '+': return x + y;
        case '-': return x - y;
        case '*': return x * y;
        case '/': return y === 0 ? '#DIV/0!' : x / y;
        case '^': { const r = Math.pow(x, y); return Number.isFinite(r) ? r : '#VALUE!'; }
      }
      return '#ERROR!';
    }
    function kind(v) { return typeof v === 'string' ? 'text' : 'num'; }
    function compare(op, a, b) {
      const norm = (v) => (v === '' ? '' : typeof v === 'boolean' ? (v ? 1 : 0) : v);
      a = norm(a); b = norm(b);
      if (a === '' && kind(b) === 'num') a = 0;
      if (b === '' && kind(a) === 'num') b = 0;
      const ka = kind(a), kb = kind(b);
      if (op === '=' || op === '<>') {
        let eq;
        if (ka !== kb) eq = false;
        else if (ka === 'text') eq = a.toLowerCase() === b.toLowerCase();
        else eq = a === b;
        return op === '=' ? eq : !eq;
      }
      if (ka !== kb) return '#VALUE!';
      const x = ka === 'text' ? a.toLowerCase() : a;
      const y = ka === 'text' ? b.toLowerCase() : b;
      if (op === '<') return x < y;
      if (op === '>') return x > y;
      if (op === '<=') return x <= y;
      return x >= y;
    }
    function gather(args) {
      const nums = [];
      for (const arg of args) {
        if (arg.k === 'range') {
          const vals = rangeValues(arg);
          if (isErr(vals)) return vals;
          for (const v of vals) { if (isErr(v)) return v; if (typeof v === 'number') nums.push(v); }
        } else if (arg.k === 'ref') {
          const v = evaluate(arg);
          if (isErr(v)) return v;
          if (typeof v === 'number') nums.push(v);
        } else {
          const v = num(evaluate(arg));
          if (isErr(v)) return v;
          nums.push(v);
        }
      }
      return nums;
    }
    function callFn(n) {
      const { name, args } = n;
      switch (name) {
        case 'SUM': case 'AVERAGE': case 'MIN': case 'MAX': case 'COUNT': {
          const nums = gather(args);
          if (isErr(nums)) return nums;
          if (name === 'SUM') return nums.reduce((s, x) => s + x, 0);
          if (name === 'COUNT') return nums.length;
          if (name === 'AVERAGE') return nums.length ? nums.reduce((s, x) => s + x, 0) / nums.length : '#DIV/0!';
          if (!nums.length) return 0;
          return name === 'MIN' ? Math.min(...nums) : Math.max(...nums);
        }
        case 'IF': {
          if (args.length < 2 || args.length > 3) return '#ERROR!';
          const c = evaluate(args[0]);
          if (isErr(c)) return c;
          let truth;
          if (typeof c === 'boolean') truth = c;
          else if (typeof c === 'number') truth = c !== 0;
          else if (c === '') truth = false;
          else return '#VALUE!';
          if (truth) return evaluate(args[1]);
          return args.length === 3 ? evaluate(args[2]) : false;
        }
        case 'ROUND': {
          if (args.length !== 2) return '#ERROR!';
          const x = num(evaluate(args[0])); if (isErr(x)) return x;
          const d = num(evaluate(args[1])); if (isErr(d)) return d;
          const f = Math.pow(10, Math.trunc(d));
          const r = Math.sign(x) * Math.round(Math.abs(x) * f + 1e-9) / f;
          return Object.is(r, -0) ? 0 : r;
        }
        case 'ABS': {
          if (args.length !== 1) return '#ERROR!';
          const x = num(evaluate(args[0])); return isErr(x) ? x : Math.abs(x);
        }
      }
      return '#NAME?';
    }
    // evaluate every cell; cells caught in or depending on a cycle become #CYCLE!
    for (const k of Object.keys(raws)) {
      try { value(k); } catch (e) { if (!(e && e.cycle)) throw e; }
    }
    for (const k of Object.keys(state)) if (state[k] === 'busy') { state[k] = 'done'; cache[k] = '#CYCLE!'; }
    // second pass: a cell left half-done by an unwound cycle may have missed its value
    for (const k of Object.keys(raws)) if (!(k in cache)) cache[k] = '#CYCLE!';
  }

  function norm(ref) {
    const r = parseRef(String(ref).trim());
    if (!r || !inGrid(r.c, r.r)) throw new Error('bad ref ' + ref);
    return key(r.c, r.r);
  }

  const sheet = {
    set(ref, raw) {
      const k = norm(ref);
      record();
      raw = raw == null ? '' : String(raw);
      if (raw === '') delete raws[k]; else raws[k] = raw;
      cache = null;
    },
    raw(ref) { return raws[norm(ref)] || ''; },
    get(ref) {
      const k = norm(ref);
      if (!cache) compute();
      return k in cache ? cache[k] : '';
    },
    display(ref) { return show(sheet.get(ref)); },
    copy(from, to) {
      const a = parseRef(norm(from)), b = parseRef(norm(to));
      const raw = raws[key(a.c, a.r)] || '';
      const next = raw.startsWith('=') ? '=' + shiftFormula(raw.slice(1), b.c - a.c, b.r - a.r) : raw;
      sheet.set(key(b.c, b.r), next);
    },
    undo() { if (!past.length) return false; future.push(snapshot()); raws = past.pop(); cache = null; return true; },
    redo() { if (!future.length) return false; past.push(snapshot()); raws = future.pop(); cache = null; return true; },
    toCSV() {
      let maxR = -1, maxC = -1;
      for (const k of Object.keys(raws)) { const r = parseRef(k); maxR = Math.max(maxR, r.r); maxC = Math.max(maxC, r.c); }
      const lines = [];
      for (let r = 0; r <= maxR; r++) {
        const row = [];
        for (let c = 0; c <= maxC; c++) {
          const s = raws[key(c, r)] ? sheet.display(key(c, r)) : '';
          row.push(/[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
        }
        lines.push(row.join(','));
      }
      return lines.join('\n');
    },
    _raws() { return { ...raws }; },
    _load(obj) { raws = { ...obj }; cache = null; },
  };
  return sheet;
}
