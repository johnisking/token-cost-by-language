const COLS = 10;
const ROWS = 30;
const HISTORY_LIMIT = 100;

class Err {
  constructor(code) { this.code = code; }
}
const EMPTY = { empty: true };
const fail = (code) => { throw new Err(code); };

const NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
const REF_RE = /\$?([A-Za-z]+)\$?(\d+)/y;
const ID_RE = /[A-Za-z_][A-Za-z0-9_.]*/y;
const NUMLIT_RE = /(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/iy;

function lettersToCol(s) {
  let n = 0;
  for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
const colToLetter = (c) => String.fromCharCode(64 + c);

function parseRefKey(ref) {
  if (typeof ref !== 'string') return null;
  const m = /^\$?([A-Za-z]+)\$?(\d+)$/.exec(ref.trim());
  if (!m) return null;
  const col = lettersToCol(m[1]);
  const row = parseInt(m[2], 10);
  if (col < 1 || col > COLS || row < 1 || row > ROWS) return null;
  return { col, row, key: colToLetter(col) + row };
}

function fmtNumber(v) {
  if (!isFinite(v)) return String(v);
  if (Math.abs(v) >= 1e21) return String(v);
  let s = v.toFixed(10);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s;
}

// ---------- tokenizer ----------
function tokenize(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    const start = i;
    if (ch === '"') {
      let j = i + 1, s = '';
      for (;;) {
        if (j >= src.length) throw new Error('unterminated');
        if (src[j] === '"') {
          if (src[j + 1] === '"') { s += '"'; j += 2; continue; }
          j++; break;
        }
        s += src[j++];
      }
      toks.push({ t: 'str', v: s, start, end: j });
      i = j; continue;
    }
    if (src.startsWith('#REF!', i)) {
      toks.push({ t: 'referr', start, end: i + 5 });
      i += 5; continue;
    }
    if (/[0-9.]/.test(ch)) {
      NUMLIT_RE.lastIndex = i;
      const m = NUMLIT_RE.exec(src);
      if (!m) throw new Error('bad number');
      toks.push({ t: 'num', v: parseFloat(m[0]), start, end: i + m[0].length });
      i += m[0].length; continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      REF_RE.lastIndex = i;
      const m = REF_RE.exec(src);
      if (m) {
        const after = src[i + m[0].length];
        if (after !== '(' && !(after !== undefined && /[A-Za-z0-9_.]/.test(after))) {
          const text = m[0];
          const colAbs = text[0] === '$';
          const rowAbs = /\$\d+$/.test(text);
          toks.push({
            t: 'ref', col: lettersToCol(m[1]), row: parseInt(m[2], 10),
            colAbs, rowAbs, start, end: i + text.length,
          });
          i += text.length; continue;
        }
      }
      ID_RE.lastIndex = i;
      const id = ID_RE.exec(src);
      if (!id) throw new Error('bad char');
      toks.push({ t: 'id', v: id[0], start, end: i + id[0].length });
      i += id[0].length; continue;
    }
    const two = src.substr(i, 2);
    if (two === '<=' || two === '>=' || two === '<>') {
      toks.push({ t: 'op', v: two, start, end: i + 2 }); i += 2; continue;
    }
    if ('=<>&+-*/^(),:'.includes(ch)) {
      toks.push({ t: 'op', v: ch, start, end: i + 1 }); i++; continue;
    }
    throw new Error('bad char');
  }
  return toks;
}

// ---------- parser ----------
function parseFormula(src) {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v) => toks[p] && toks[p].t === 'op' && toks[p].v === v;
  const bad = () => { throw new Error('parse'); };

  const refNode = (t) => {
    const ok = t.col >= 1 && t.col <= COLS && t.row >= 1 && t.row <= ROWS;
    return ok ? { t: 'ref', col: t.col, row: t.row } : { t: 'err', code: '#REF!' };
  };

  function cmp() {
    let l = cat();
    while (peek() && peek().t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(peek().v)) {
      const op = toks[p++].v;
      l = { t: 'bin', op, l, r: cat() };
    }
    return l;
  }
  function cat() {
    let l = add();
    while (isOp('&')) { p++; l = { t: 'bin', op: '&', l, r: add() }; }
    return l;
  }
  function add() {
    let l = mul();
    while (isOp('+') || isOp('-')) { const op = toks[p++].v; l = { t: 'bin', op, l, r: mul() }; }
    return l;
  }
  function mul() {
    let l = unary();
    while (isOp('*') || isOp('/')) { const op = toks[p++].v; l = { t: 'bin', op, l, r: unary() }; }
    return l;
  }
  function unary() {
    if (isOp('-') || isOp('+')) {
      const op = toks[p++].v;
      return { t: 'un', op, e: unary() };
    }
    return pow();
  }
  function pow() {
    const base = primary();
    if (isOp('^')) { p++; return { t: 'bin', op: '^', l: base, r: unary() }; }
    return base;
  }
  function primary() {
    const tk = toks[p++];
    if (!tk) bad();
    if (tk.t === 'num') return { t: 'num', v: tk.v };
    if (tk.t === 'str') return { t: 'str', v: tk.v };
    if (tk.t === 'referr' || tk.t === 'ref') {
      const a = tk.t === 'ref' ? refNode(tk) : { t: 'err', code: '#REF!' };
      if (isOp(':')) {
        p++;
        const t2 = toks[p++];
        if (!t2 || (t2.t !== 'ref' && t2.t !== 'referr')) bad();
        const b = t2.t === 'ref' ? refNode(t2) : { t: 'err', code: '#REF!' };
        if (a.t === 'err' || b.t === 'err') return { t: 'err', code: '#REF!' };
        return { t: 'range', a, b };
      }
      return a;
    }
    if (tk.t === 'id') {
      if (isOp('(')) {
        p++;
        const args = [];
        if (isOp(')')) { p++; } else {
          for (;;) {
            args.push(cmp());
            if (isOp(',')) { p++; continue; }
            if (isOp(')')) { p++; break; }
            bad();
          }
        }
        return { t: 'fn', name: tk.v.toUpperCase(), args };
      }
      const u = tk.v.toUpperCase();
      if (u === 'TRUE') return { t: 'bool', v: true };
      if (u === 'FALSE') return { t: 'bool', v: false };
      return { t: 'err', code: '#NAME?' };
    }
    if (tk.t === 'op' && tk.v === '(') {
      const e = cmp();
      if (!isOp(')')) bad();
      p++;
      return e;
    }
    return bad();
  }

  const ast = cmp();
  if (p < toks.length) bad();
  return ast;
}

function shiftFormula(raw, dc, dr) {
  let toks;
  try { toks = tokenize(raw.slice(1)); } catch { return raw; }
  const body = raw.slice(1);
  let out = '', last = 0;
  for (const t of toks) {
    if (t.t !== 'ref') continue;
    const inRange = t.col >= 1 && t.col <= COLS && t.row >= 1 && t.row <= ROWS;
    const nc = t.colAbs ? t.col : t.col + dc;
    const nr = t.rowAbs ? t.row : t.row + dr;
    let rep;
    if (!inRange || nc < 1 || nc > COLS || nr < 1 || nr > ROWS) rep = '#REF!';
    else rep = (t.colAbs ? '$' : '') + colToLetter(nc) + (t.rowAbs ? '$' : '') + nr;
    out += body.slice(last, t.start) + rep;
    last = t.end;
  }
  return '=' + out + body.slice(last);
}

// ---------- sheet ----------
export function createSheet() {
  const cells = new Map(); // key -> raw
  let undoStack = [];
  let redoStack = [];
  let cache = new Map();
  const visiting = new Set();
  const asts = new Map();

  const rawOf = (key) => cells.get(key) ?? '';

  function applyRaw(key, raw) {
    if (raw === '') cells.delete(key); else cells.set(key, raw);
    cache = new Map();
  }

  function astOf(raw) {
    if (!asts.has(raw)) {
      let a;
      try { a = parseFormula(raw.slice(1)); } catch { a = { t: 'err', code: '#ERROR!' }; }
      asts.set(raw, a);
    }
    return asts.get(raw);
  }

  function cellValue(key) {
    const hit = cache.get(key);
    if (hit) {
      if (hit.err) throw hit.err;
      return hit.val;
    }
    if (visiting.has(key)) throw new Err('#CYCLE!');
    visiting.add(key);
    let entry;
    try {
      const raw = rawOf(key);
      let val;
      if (raw === '') val = EMPTY;
      else if (raw[0] === '=') {
        val = evalNode(astOf(raw));
        if (val === EMPTY) val = 0;
      } else if (NUM_RE.test(raw.trim())) val = parseFloat(raw.trim());
      else val = raw;
      entry = { val };
    } catch (e) {
      if (!(e instanceof Err)) throw e;
      entry = { err: e };
    } finally {
      visiting.delete(key);
    }
    cache.set(key, entry);
    if (entry.err) throw entry.err;
    return entry.val;
  }

  const nodeKey = (n) => colToLetter(n.col) + n.row;

  function toNum(v) {
    if (v === EMPTY) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return fail('#VALUE!');
  }
  function toText(v) {
    if (v === EMPTY) return '';
    if (typeof v === 'number') return fmtNumber(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return v;
  }
  function toBool(v) {
    if (v === EMPTY) return false;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    return fail('#VALUE!');
  }
  function checkNum(n) {
    if (Number.isNaN(n) || !isFinite(n)) fail('#VALUE!');
    return n;
  }

  function compare(op, a, b) {
    // returns boolean
    if (a === EMPTY && b === EMPTY) { a = 0; b = 0; }
    else if (a === EMPTY) a = typeof b === 'string' ? '' : (typeof b === 'boolean' ? false : 0);
    else if (b === EMPTY) b = typeof a === 'string' ? '' : (typeof a === 'boolean' ? false : 0);
    const sa = typeof a === 'string', sb = typeof b === 'string';
    if (sa !== sb) {
      if (op === '=') return false;
      if (op === '<>') return true;
      return fail('#VALUE!');
    }
    let x = a, y = b;
    if (sa) { x = a.toLowerCase(); y = b.toLowerCase(); }
    else { x = toNum(a); y = toNum(b); }
    switch (op) {
      case '=': return x === y;
      case '<>': return x !== y;
      case '<': return x < y;
      case '>': return x > y;
      case '<=': return x <= y;
      default: return x >= y;
    }
  }

  function roundHalfAway(x, d) {
    d = Math.trunc(d);
    const s = Math.abs(x);
    let r;
    const str = String(s);
    if (str.includes('e')) {
      const f = Math.pow(10, d);
      r = Math.round(s * f) / f;
    } else {
      r = Number(Math.round(Number(str + 'e' + d)) + 'e' + (-d));
    }
    return x < 0 ? -r : r;
  }

  function collect(args, countMode) {
    const nums = [];
    const addCell = (key) => {
      const v = cellValue(key);
      if (typeof v === 'number') nums.push(v);
    };
    for (const a of args) {
      if (a.t === 'range') {
        const r1 = Math.min(a.a.row, a.b.row), r2 = Math.max(a.a.row, a.b.row);
        const c1 = Math.min(a.a.col, a.b.col), c2 = Math.max(a.a.col, a.b.col);
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) addCell(colToLetter(c) + r);
      } else if (a.t === 'ref') {
        addCell(nodeKey(a));
      } else {
        const v = evalNode(a);
        if (typeof v === 'number') nums.push(v);
        else if (countMode) continue;
        else nums.push(toNum(v));
      }
    }
    return nums;
  }

  function callFn(n) {
    const { name, args } = n;
    switch (name) {
      case 'SUM': return collect(args).reduce((s, x) => s + x, 0);
      case 'AVERAGE': {
        const v = collect(args);
        if (!v.length) fail('#DIV/0!');
        return v.reduce((s, x) => s + x, 0) / v.length;
      }
      case 'MIN': { const v = collect(args); return v.length ? Math.min(...v) : 0; }
      case 'MAX': { const v = collect(args); return v.length ? Math.max(...v) : 0; }
      case 'COUNT': return collect(args, true).length;
      case 'IF': {
        if (args.length < 2 || args.length > 3) fail('#ERROR!');
        const c = toBool(evalNode(args[0]));
        if (c) return evalNode(args[1]);
        return args.length === 3 ? evalNode(args[2]) : false;
      }
      case 'ROUND': {
        if (args.length < 1 || args.length > 2) fail('#ERROR!');
        const x = toNum(evalNode(args[0]));
        const d = args.length === 2 ? toNum(evalNode(args[1])) : 0;
        return checkNum(roundHalfAway(x, d));
      }
      case 'ABS': {
        if (args.length !== 1) fail('#ERROR!');
        return Math.abs(toNum(evalNode(args[0])));
      }
      default: return fail('#NAME?');
    }
  }

  function evalNode(n) {
    switch (n.t) {
      case 'num': case 'str': case 'bool': return n.v;
      case 'err': return fail(n.code);
      case 'ref': return cellValue(nodeKey(n));
      case 'range': return fail('#VALUE!');
      case 'un': {
        const v = toNum(evalNode(n.e));
        return n.op === '-' ? -v : v;
      }
      case 'fn': return callFn(n);
      case 'bin': {
        const a = evalNode(n.l);
        const b = evalNode(n.r);
        switch (n.op) {
          case '&': return toText(a) + toText(b);
          case '+': return toNum(a) + toNum(b);
          case '-': return toNum(a) - toNum(b);
          case '*': return toNum(a) * toNum(b);
          case '/': {
            const y = toNum(b), x = toNum(a);
            if (y === 0) fail('#DIV/0!');
            return x / y;
          }
          case '^': {
            const x = toNum(a), y = toNum(b);
            if (x === 0 && y < 0) fail('#DIV/0!');
            return checkNum(Math.pow(x, y));
          }
          default: return compare(n.op, a, b);
        }
      }
      default: return fail('#ERROR!');
    }
  }

  function record(key, before, after) {
    undoStack.push({ key, before, after });
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
  }

  const api = {
    set(ref, raw) {
      const r = parseRefKey(ref);
      if (!r) return;
      raw = raw == null ? '' : String(raw);
      const before = rawOf(r.key);
      applyRaw(r.key, raw);
      record(r.key, before, raw);
    },
    get(ref) {
      const r = parseRefKey(ref);
      if (!r) return '#REF!';
      try {
        const v = cellValue(r.key);
        return v === EMPTY ? '' : v;
      } catch (e) {
        if (e instanceof Err) return e.code;
        throw e;
      }
    },
    raw(ref) {
      const r = parseRefKey(ref);
      return r ? rawOf(r.key) : '';
    },
    display(ref) {
      const v = api.get(ref);
      if (typeof v === 'number') return fmtNumber(v);
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      return v;
    },
    copy(from, to) {
      const f = parseRefKey(from), t = parseRefKey(to);
      if (!f || !t) return;
      const src = rawOf(f.key);
      const raw = src[0] === '=' ? shiftFormula(src, t.col - f.col, t.row - f.row) : src;
      const before = rawOf(t.key);
      applyRaw(t.key, raw);
      record(t.key, before, raw);
    },
    undo() {
      const s = undoStack.pop();
      if (!s) return false;
      applyRaw(s.key, s.before);
      redoStack.push(s);
      return true;
    },
    redo() {
      const s = redoStack.pop();
      if (!s) return false;
      applyRaw(s.key, s.after);
      undoStack.push(s);
      return true;
    },
    toCSV() {
      let maxR = 0, maxC = 0;
      for (const key of cells.keys()) {
        const r = parseRefKey(key);
        maxR = Math.max(maxR, r.row);
        maxC = Math.max(maxC, r.col);
      }
      const lines = [];
      for (let r = 1; r <= maxR; r++) {
        const row = [];
        for (let c = 1; c <= maxC; c++) {
          const s = String(api.display(colToLetter(c) + r));
          row.push(/[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
        }
        lines.push(row.join(','));
      }
      return lines.join('\n');
    },
    // extras for the page: bulk load without history, and a snapshot of raw texts
    load(map) {
      cells.clear();
      for (const [k, v] of Object.entries(map || {})) {
        const r = parseRefKey(k);
        if (r && typeof v === 'string' && v !== '') cells.set(r.key, v);
      }
      cache = new Map();
      undoStack = [];
      redoStack = [];
    },
    snapshot() {
      return Object.fromEntries(cells);
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  };
  return api;
}
