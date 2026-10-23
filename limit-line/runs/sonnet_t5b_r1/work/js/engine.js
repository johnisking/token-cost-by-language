const COLS = 10;
const ROWS = 30;

class XErr {
  constructor(code) { this.code = code; }
}
const fail = (c) => { throw new XErr(c); };

const inRange = (c, r) => c >= 1 && c <= COLS && r >= 1 && r <= ROWS;
const colName = (c) => String.fromCharCode(64 + c);
const refName = (c, r) => colName(c) + r;

function parseRef(s) {
  const m = /^(\$?)([A-Za-z]+)(\$?)(\d+)$/.exec(s);
  if (!m) return null;
  let col = 0;
  for (const ch of m[2].toUpperCase()) col = col * 26 + ch.charCodeAt(0) - 64;
  return { colAbs: !!m[1], col, rowAbs: !!m[3], row: parseInt(m[4], 10) };
}

function normRef(s) {
  const p = parseRef(String(s).trim());
  if (!p || !inRange(p.col, p.row)) return null;
  return refName(p.col, p.row);
}

function fmtNum(x) {
  if (!Number.isFinite(x)) return String(x);
  const n = Number(x.toFixed(10));
  return String(n === 0 ? 0 : n);
}

function str(v) {
  if (v === null) return '';
  if (typeof v === 'number') return fmtNum(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return v;
}

// ---------- tokenizer ----------
function tokenize(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') {
      let j = i + 1;
      let s = '';
      for (;;) {
        if (j >= src.length) fail('#ERROR!');
        if (src[j] === '"') {
          if (src[j + 1] === '"') { s += '"'; j += 2; continue; }
          break;
        }
        s += src[j++];
      }
      toks.push({ t: 'str', v: s, start: i, end: j + 1 });
      i = j + 1;
      continue;
    }
    const rest = src.slice(i);
    let m;
    if ((m = /^#REF!/i.exec(rest))) {
      toks.push({ t: 'referr', start: i, end: i + m[0].length });
    } else if ((m = /^(\d+\.?\d*|\.\d+)/.exec(rest))) {
      toks.push({ t: 'num', v: Number(m[0]), start: i, end: i + m[0].length });
    } else if ((m = /^\$?[A-Za-z]+\$?\d+(?![A-Za-z0-9_.(])/.exec(rest))) {
      toks.push({ t: 'ref', text: m[0], start: i, end: i + m[0].length });
    } else if ((m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(rest))) {
      toks.push({ t: 'id', text: m[0], start: i, end: i + m[0].length });
    } else if ((m = /^(<=|>=|<>|[-+*\/^&=<>(),:])/.exec(rest))) {
      toks.push({ t: 'op', text: m[0], start: i, end: i + m[0].length });
    } else {
      fail('#ERROR!');
    }
    i += m[0].length;
  }
  return toks;
}

// ---------- parser ----------
function parseFormula(src) {
  const toks = tokenize(src);
  let p = 0;
  const peekOp = (...ops) => {
    const t = toks[p];
    return t && t.t === 'op' && ops.includes(t.text) ? t.text : null;
  };
  const expectOp = (o) => { if (!peekOp(o)) fail('#ERROR!'); p++; };

  function binLevel(next, ops) {
    return () => {
      let a = next();
      let op;
      while ((op = peekOp(...ops))) {
        p++;
        a = { type: 'bin', op, a, b: next() };
      }
      return a;
    };
  }
  function refNode(t) {
    const r = parseRef(t.text);
    return { type: 'ref', col: r.col, row: r.row };
  }
  function primary() {
    const t = toks[p];
    if (!t) fail('#ERROR!');
    if (t.t === 'num') { p++; return { type: 'num', v: t.v }; }
    if (t.t === 'str') { p++; return { type: 'str', v: t.v }; }
    if (t.t === 'op' && t.text === '(') {
      p++;
      const e = cmp();
      expectOp(')');
      return e;
    }
    if (t.t === 'ref' || t.t === 'referr') {
      p++;
      const a = t.t === 'ref' ? refNode(t) : null;
      if (peekOp(':')) {
        p++;
        const u = toks[p];
        if (!u || (u.t !== 'ref' && u.t !== 'referr')) fail('#ERROR!');
        p++;
        const b = u.t === 'ref' ? refNode(u) : null;
        if (!a || !b || !inRange(a.col, a.row) || !inRange(b.col, b.row)) return { type: 'referr' };
        return {
          type: 'range',
          c1: Math.min(a.col, b.col), c2: Math.max(a.col, b.col),
          r1: Math.min(a.row, b.row), r2: Math.max(a.row, b.row),
        };
      }
      return a || { type: 'referr' };
    }
    if (t.t === 'id') {
      p++;
      if (peekOp('(')) {
        p++;
        const args = [];
        if (!peekOp(')')) {
          args.push(cmp());
          while (peekOp(',')) { p++; args.push(cmp()); }
        }
        expectOp(')');
        return { type: 'func', name: t.text.toUpperCase(), args };
      }
      const up = t.text.toUpperCase();
      if (up === 'TRUE') return { type: 'bool', v: true };
      if (up === 'FALSE') return { type: 'bool', v: false };
      return { type: 'name' };
    }
    fail('#ERROR!');
  }
  function unary() {
    const op = peekOp('-', '+');
    if (op) { p++; return { type: 'un', op, a: unary() }; }
    return pow();
  }
  function pow() {
    const a = primary();
    if (peekOp('^')) {
      p++;
      return { type: 'bin', op: '^', a, b: unary() };
    }
    return a;
  }
  const mul = binLevel(unary, ['*', '/']);
  const add = binLevel(mul, ['+', '-']);
  const cat = binLevel(add, ['&']);
  const cmp = binLevel(cat, ['=', '<>', '<=', '>=', '<', '>']);

  const ast = cmp();
  if (p < toks.length) fail('#ERROR!');
  return ast;
}

function collectDeps(n, out) {
  if (!n || typeof n !== 'object') return;
  if (n.type === 'ref') out.add(refName(n.col, n.row));
  else if (n.type === 'range') {
    for (let r = n.r1; r <= n.r2; r++) for (let c = n.c1; c <= n.c2; c++) out.add(refName(c, r));
  } else {
    if (n.a) collectDeps(n.a, out);
    if (n.b) collectDeps(n.b, out);
    if (n.args) n.args.forEach((x) => collectDeps(x, out));
  }
}

function shiftFormula(raw, dc, dr) {
  let toks;
  try { toks = tokenize(raw.slice(1)); } catch (e) { return raw; }
  const src = raw.slice(1);
  let out = '';
  let last = 0;
  for (const t of toks) {
    if (t.t !== 'ref') continue;
    const r = parseRef(t.text);
    const c = r.colAbs ? r.col : r.col + dc;
    const w = r.rowAbs ? r.row : r.row + dr;
    out += src.slice(last, t.start);
    out += inRange(c, w) ? (r.colAbs ? '$' : '') + colName(c) + (r.rowAbs ? '$' : '') + w : '#REF!';
    last = t.end;
  }
  return '=' + out + src.slice(last);
}

const NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

function compile(raw) {
  if (raw[0] === '=') {
    try {
      const ast = parseFormula(raw.slice(1));
      const deps = new Set();
      collectDeps(ast, deps);
      return { raw, ast, deps: [...deps] };
    } catch (e) {
      if (e instanceof XErr) return { raw, err: e.code, deps: [] };
      throw e;
    }
  }
  const t = raw.trim();
  if (NUM_RE.test(t)) return { raw, v: Number(t), deps: [] };
  return { raw, v: raw, deps: [] };
}

function toNum(v) {
  if (v === null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return fail('#VALUE!');
}

function round(x, d) {
  d = Math.trunc(d);
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  let res;
  if (d >= 0) {
    const m = Math.pow(10, d);
    res = Math.floor(Number((a * m).toPrecision(15)) + 0.5) / m;
  } else {
    const m = Math.pow(10, -d);
    res = Math.floor(Number((a / m).toPrecision(15)) + 0.5) * m;
  }
  return sign * res;
}

function compare(op, a, b) {
  const zero = (o) => (typeof o === 'string' ? '' : typeof o === 'boolean' ? false : 0);
  if (a === null && b === null) { a = 0; b = 0; }
  else if (a === null) a = zero(b);
  else if (b === null) b = zero(a);
  if (op === '=' || op === '<>') {
    let eq;
    if (typeof a !== typeof b) eq = false;
    else if (typeof a === 'string') eq = a.toLowerCase() === b.toLowerCase();
    else eq = a === b;
    return op === '=' ? eq : !eq;
  }
  let x, y;
  if (typeof a === 'string' && typeof b === 'string') { x = a.toLowerCase(); y = b.toLowerCase(); }
  else if (typeof a === 'string' || typeof b === 'string') return fail('#VALUE!');
  else { x = toNum(a); y = toNum(b); }
  switch (op) {
    case '<': return x < y;
    case '>': return x > y;
    case '<=': return x <= y;
    default: return x >= y;
  }
}

// ---------- sheet ----------
export function createSheet() {
  const cells = new Map();
  let undoStack = [];
  let redoStack = [];
  let cache = null;

  function analyse() {
    const vals = new Map();
    const bad = new Set();
    const state = new Map();
    const stack = [];
    const dfs = (ref) => {
      state.set(ref, 1);
      stack.push(ref);
      let isBad = false;
      for (const d of cells.get(ref).deps) {
        if (!cells.has(d)) continue;
        const s = state.get(d);
        if (s === 1) {
          for (let x = stack.indexOf(d); x < stack.length; x++) bad.add(stack[x]);
        } else if (s === undefined) dfs(d);
        if (bad.has(d)) isBad = true;
      }
      if (isBad) bad.add(ref);
      stack.pop();
      state.set(ref, 2);
    };
    for (const ref of cells.keys()) if (!state.has(ref)) dfs(ref);

    const lookup = (c, r) => {
      if (!inRange(c, r)) fail('#REF!');
      const ref = refName(c, r);
      if (!cells.has(ref)) return null;
      const v = cellVal(ref);
      if (v instanceof XErr) throw v;
      return v;
    };

    const numsOf = (args) => {
      const out = [];
      for (const a of args) {
        if (a.type === 'range') {
          for (let r = a.r1; r <= a.r2; r++) {
            for (let c = a.c1; c <= a.c2; c++) {
              const v = lookup(c, r);
              if (typeof v === 'number') out.push(v);
            }
          }
        } else if (a.type === 'ref') {
          const v = lookup(a.col, a.row);
          if (typeof v === 'number') out.push(v);
        } else {
          const v = ev(a);
          if (v !== null) out.push(toNum(v));
        }
      }
      return out;
    };

    const call = (n) => {
      const args = n.args;
      switch (n.name) {
        case 'SUM': return numsOf(args).reduce((s, x) => s + x, 0);
        case 'AVERAGE': {
          const xs = numsOf(args);
          if (!xs.length) fail('#DIV/0!');
          return xs.reduce((s, x) => s + x, 0) / xs.length;
        }
        case 'MIN': { const xs = numsOf(args); return xs.length ? Math.min(...xs) : 0; }
        case 'MAX': { const xs = numsOf(args); return xs.length ? Math.max(...xs) : 0; }
        case 'COUNT': return numsOf(args).length;
        case 'IF': {
          if (args.length < 2 || args.length > 3) fail('#VALUE!');
          const c = ev(args[0]);
          let b;
          if (c === null) b = false;
          else if (typeof c === 'string') return fail('#VALUE!');
          else b = typeof c === 'boolean' ? c : c !== 0;
          if (b) return ev(args[1]);
          return args.length === 3 ? ev(args[2]) : false;
        }
        case 'ROUND': {
          if (args.length < 1 || args.length > 2) fail('#VALUE!');
          const x = ev(args[0]);
          const d = args.length === 2 ? ev(args[1]) : 0;
          return round(toNum(x), toNum(d));
        }
        case 'ABS': {
          if (args.length !== 1) fail('#VALUE!');
          return Math.abs(toNum(ev(args[0])));
        }
        default: return fail('#NAME?');
      }
    };

    function ev(n) {
      switch (n.type) {
        case 'num': case 'str': case 'bool': return n.v;
        case 'referr': return fail('#REF!');
        case 'name': return fail('#NAME?');
        case 'ref': return lookup(n.col, n.row);
        case 'range': return fail('#VALUE!');
        case 'un': {
          const x = toNum(ev(n.a));
          return n.op === '-' ? -x : x;
        }
        case 'func':
          if (!['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'IF', 'ROUND', 'ABS'].includes(n.name)) fail('#NAME?');
          return call(n);
        case 'bin': {
          const a = ev(n.a);
          const b = ev(n.b);
          switch (n.op) {
            case '&': return str(a) + str(b);
            case '+': return toNum(a) + toNum(b);
            case '-': return toNum(a) - toNum(b);
            case '*': return toNum(a) * toNum(b);
            case '/': {
              const x = toNum(a);
              const y = toNum(b);
              if (y === 0) fail('#DIV/0!');
              return x / y;
            }
            case '^': {
              const x = toNum(a);
              const y = toNum(b);
              if (x === 0 && y < 0) fail('#DIV/0!');
              return Math.pow(x, y);
            }
            default: return compare(n.op, a, b);
          }
        }
        default: return fail('#ERROR!');
      }
    }

    function cellVal(ref) {
      if (vals.has(ref)) return vals.get(ref);
      const cell = cells.get(ref);
      let v;
      if (bad.has(ref)) v = new XErr('#CYCLE!');
      else if (cell.err) v = new XErr(cell.err);
      else if (cell.ast) {
        try {
          v = ev(cell.ast);
          if (v === null) v = 0;
          if (typeof v === 'number') {
            if (!Number.isFinite(v)) v = new XErr('#VALUE!');
            else if (v === 0) v = 0;
          }
        } catch (e) {
          if (e instanceof XErr) v = e;
          else throw e;
        }
      } else v = cell.v;
      vals.set(ref, v);
      return v;
    }
    return cellVal;
  }

  function get(ref) {
    const r = normRef(ref);
    if (!r) return '#REF!';
    if (!cells.has(r)) return '';
    if (!cache) cache = analyse();
    const v = cache(r);
    return v instanceof XErr ? v.code : v;
  }

  function put(ref, raw) {
    if (raw === '') cells.delete(ref);
    else cells.set(ref, compile(raw));
    cache = null;
  }
  const rawOf = (ref) => (cells.has(ref) ? cells.get(ref).raw : '');

  function record(ref, raw) {
    undoStack.push({ ref, old: rawOf(ref), next: raw });
    if (undoStack.length > 100) undoStack.shift();
    redoStack = [];
    put(ref, raw);
  }

  function display(ref) {
    const v = get(ref);
    if (typeof v === 'number') return fmtNum(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return v;
  }

  return {
    set(ref, raw) {
      const r = normRef(ref);
      if (!r) return;
      record(r, String(raw ?? ''));
    },
    get,
    raw(ref) {
      const r = normRef(ref);
      return r ? rawOf(r) : '';
    },
    display,
    copy(from, to) {
      const f = normRef(from);
      const t = normRef(to);
      if (!f || !t) return;
      const pf = parseRef(f);
      const pt = parseRef(t);
      let raw = rawOf(f);
      if (raw[0] === '=') raw = shiftFormula(raw, pt.col - pf.col, pt.row - pf.row);
      record(t, raw);
    },
    undo() {
      const e = undoStack.pop();
      if (!e) return;
      put(e.ref, e.old);
      redoStack.push(e);
    },
    redo() {
      const e = redoStack.pop();
      if (!e) return;
      put(e.ref, e.next);
      undoStack.push(e);
    },
    load(map) {
      for (const [k, v] of Object.entries(map || {})) {
        const r = normRef(k);
        if (r && typeof v === 'string') put(r, v);
      }
    },
    toCSV() {
      let maxC = 0;
      let maxR = 0;
      for (const ref of cells.keys()) {
        const p = parseRef(ref);
        maxC = Math.max(maxC, p.col);
        maxR = Math.max(maxR, p.row);
      }
      const q = (s) => (/[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
      const lines = [];
      for (let r = 1; r <= maxR; r++) {
        const row = [];
        for (let c = 1; c <= maxC; c++) row.push(q(display(refName(c, r))));
        lines.push(row.join(','));
      }
      return lines.join('\n');
    },
  };
}
