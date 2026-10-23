// Spreadsheet engine: no DOM code.

export const COLS = 10;
export const ROWS = 30;
const MAX_UNDO = 100;

class Err {
  constructor(code) { this.code = code; }
}
const ERR = {};
for (const code of ['#DIV/0!', '#REF!', '#NAME?', '#VALUE!', '#CYCLE!', '#ERROR!']) ERR[code] = new Err(code);

const EMPTY = { empty: true };

class Range {
  constructor(c1, r1, c2, r2) {
    this.c1 = Math.min(c1, c2); this.c2 = Math.max(c1, c2);
    this.r1 = Math.min(r1, r2); this.r2 = Math.max(r1, r2);
  }
  keys() {
    const out = [];
    for (let r = this.r1; r <= this.r2; r++) {
      for (let c = this.c1; c <= this.c2; c++) out.push(keyOf(c, r));
    }
    return out;
  }
}

export function colName(c) { return String.fromCharCode(65 + c); }
function keyOf(c, r) { return colName(c) + (r + 1); }

function colIndex(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function inArea(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }

// Parses an API reference like "B3"; returns {c, r, key} or null.
function parseRef(ref) {
  const m = /^\s*([A-Za-z]+)(\d+)\s*$/.exec(String(ref));
  if (!m) return null;
  const c = colIndex(m[1]);
  const r = parseInt(m[2], 10) - 1;
  if (!inArea(c, r)) return null;
  return { c, r, key: keyOf(c, r) };
}

const NUMBER_RE = /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\s*$/;

export function formatNumber(n) {
  if (Object.is(n, -0)) n = 0;
  if (Number.isInteger(n) && Math.abs(n) < 1e21) return String(n);
  let s = n.toFixed(10);
  if (/e/i.test(s)) return String(n);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s;
}

// ---------- Tokenizer ----------

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    const rest = src.slice(i);
    let m;
    if ((m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest))) {
      tokens.push({ t: 'num', v: parseFloat(m[0]), s: i, e: i + m[0].length });
      i += m[0].length;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let v = '';
      for (;;) {
        if (j >= src.length) throw new Error('unterminated string');
        if (src[j] === '"') {
          if (src[j + 1] === '"') { v += '"'; j += 2; continue; }
          j++;
          break;
        }
        v += src[j++];
      }
      tokens.push({ t: 'str', v, s: i, e: j });
      i = j;
      continue;
    }
    if ((m = /^#(DIV\/0!|REF!|NAME\?|VALUE!|CYCLE!|ERROR!)/i.exec(rest))) {
      tokens.push({ t: 'err', v: m[0].toUpperCase(), s: i, e: i + m[0].length });
      i += m[0].length;
      continue;
    }
    if ((m = /^(\$?)([A-Za-z]+)(\$?)(\d+)(?![A-Za-z0-9_.])/.exec(rest)) && !/^\s*\(/.test(rest.slice(m[0].length))) {
      const c = colIndex(m[2]);
      const r = parseInt(m[4], 10) - 1;
      tokens.push({
        t: 'ref', colAbs: m[1] === '$', rowAbs: m[3] === '$', c, r,
        valid: m[2].length <= 3 && inArea(c, r), s: i, e: i + m[0].length,
      });
      i += m[0].length;
      continue;
    }
    if ((m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(rest))) {
      const isFunc = /^\s*\(/.test(rest.slice(m[0].length));
      tokens.push({ t: isFunc ? 'func' : 'name', v: m[0].toUpperCase(), s: i, e: i + m[0].length });
      i += m[0].length;
      continue;
    }
    if ((m = /^(<=|>=|<>|[=<>&+\-*/^(),:])/.exec(rest))) {
      tokens.push({ t: 'op', v: m[0], s: i, e: i + m[0].length });
      i += m[0].length;
      continue;
    }
    throw new Error('bad character');
  }
  tokens.push({ t: 'eof', s: src.length, e: src.length });
  return tokens;
}

// ---------- Parser ----------

function parse(src) {
  const tokens = tokenize(src);
  let p = 0;
  const peek = () => tokens[p];
  const isOp = (v) => tokens[p].t === 'op' && tokens[p].v === v;
  const expect = (v) => {
    if (!isOp(v)) throw new Error('expected ' + v);
    p++;
  };

  function binaryLevel(next, ops) {
    return () => {
      let left = next();
      while (peek().t === 'op' && ops.includes(peek().v)) {
        const op = tokens[p++].v;
        left = { k: 'bin', op, l: left, r: next() };
      }
      return left;
    };
  }

  function unary() {
    if (isOp('-') || isOp('+')) {
      const op = tokens[p++].v;
      return { k: 'un', op, x: unary() };
    }
    return power();
  }

  function power() {
    const base = primary();
    if (isOp('^')) {
      p++;
      return { k: 'bin', op: '^', l: base, r: unary() };
    }
    return base;
  }

  function rangeEnd(first) {
    if (!isOp(':')) return first;
    p++;
    const t = tokens[p++];
    if (t.t !== 'ref' && !(t.t === 'err' && t.v === '#REF!')) throw new Error('bad range');
    if (first.k === 'err' || t.t === 'err' || !first.tok.valid || !t.valid) return { k: 'err', v: '#REF!' };
    return { k: 'range', a: first.tok, b: t };
  }

  function primary() {
    const t = tokens[p++];
    switch (t.t) {
      case 'num': return { k: 'num', v: t.v };
      case 'str': return { k: 'str', v: t.v };
      case 'err':
        if (t.v === '#REF!' && isOp(':')) return rangeEnd({ k: 'err', v: t.v });
        return { k: 'err', v: t.v };
      case 'ref': return rangeEnd({ k: 'ref', tok: t });
      case 'name':
        if (t.v === 'TRUE') return { k: 'bool', v: true };
        if (t.v === 'FALSE') return { k: 'bool', v: false };
        return { k: 'name', v: t.v };
      case 'func': {
        expect('(');
        const args = [];
        if (!isOp(')')) {
          args.push(expr());
          while (isOp(',')) { p++; args.push(expr()); }
        }
        expect(')');
        return { k: 'func', name: t.v, args };
      }
      case 'op':
        if (t.v === '(') {
          const e = expr();
          expect(')');
          return e;
        }
        throw new Error('unexpected ' + t.v);
      default:
        throw new Error('unexpected end');
    }
  }

  const mult = binaryLevel(unary, ['*', '/']);
  const add = binaryLevel(mult, ['+', '-']);
  const concat = binaryLevel(add, ['&']);
  const expr = binaryLevel(concat, ['=', '<>', '<', '>', '<=', '>=']);

  const ast = expr();
  if (peek().t !== 'eof') throw new Error('trailing input');
  return ast;
}

function collectDeps(node, out) {
  if (!node) return;
  switch (node.k) {
    case 'ref':
      if (node.tok.valid) out.add(keyOf(node.tok.c, node.tok.r));
      break;
    case 'range':
      for (const k of new Range(node.a.c, node.a.r, node.b.c, node.b.r).keys()) out.add(k);
      break;
    case 'un': collectDeps(node.x, out); break;
    case 'bin': collectDeps(node.l, out); collectDeps(node.r, out); break;
    case 'func': for (const a of node.args) collectDeps(a, out); break;
  }
}

// Shifts the references of a formula by dc columns and dr rows.
function shiftFormula(raw, dc, dr) {
  const body = raw.slice(1);
  let tokens;
  try { tokens = tokenize(body); } catch { return raw; }
  let out = body;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t.t !== 'ref' || !t.valid) continue;
    const c = t.colAbs ? t.c : t.c + dc;
    const r = t.rowAbs ? t.r : t.r + dr;
    const text = inArea(c, r)
      ? (t.colAbs ? '$' : '') + colName(c) + (t.rowAbs ? '$' : '') + (r + 1)
      : '#REF!';
    out = out.slice(0, t.s) + text + out.slice(t.e);
  }
  return '=' + out;
}

// ---------- Value helpers ----------

const isErr = (v) => v instanceof Err;

function toNum(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === EMPTY) return 0;
  if (isErr(v)) return v;
  return ERR['#VALUE!'];
}

function toText(v) {
  if (typeof v === 'number') return formatNumber(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v === EMPTY) return '';
  return v;
}

function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === EMPTY) return false;
  if (typeof v === 'string') {
    const u = v.toUpperCase();
    if (u === 'TRUE') return true;
    if (u === 'FALSE') return false;
  }
  return ERR['#VALUE!'];
}

function compare(op, l, r) {
  if (l === EMPTY) l = typeof r === 'string' ? '' : 0;
  if (r === EMPTY) r = typeof l === 'string' ? '' : 0;
  if (typeof l === 'boolean') l = l ? 1 : 0;
  if (typeof r === 'boolean') r = r ? 1 : 0;
  const nums = typeof l === 'number' && typeof r === 'number';
  const strs = typeof l === 'string' && typeof r === 'string';
  if (strs) { l = l.toLowerCase(); r = r.toLowerCase(); }
  if (op === '=' || op === '<>') {
    const eq = (nums || strs) && l === r;
    return op === '=' ? eq : !eq;
  }
  if (!nums && !strs) return ERR['#VALUE!'];
  switch (op) {
    case '<': return l < r;
    case '>': return l > r;
    case '<=': return l <= r;
    default: return l >= r;
  }
}

function roundHalfAway(x, digits) {
  const d = Math.trunc(digits);
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  if (d >= 0) {
    const f = Math.pow(10, d);
    const y = Math.round(parseFloat((ax * f).toPrecision(15)));
    return sign * (y / f);
  }
  const f = Math.pow(10, -d);
  const y = Math.round(parseFloat((ax / f).toPrecision(15)));
  return sign * y * f;
}

// ---------- Sheet ----------

export function createSheet() {
  const raws = new Map();
  const astCache = new Map();
  let dirty = true;
  let cycleCells = new Set();
  let memo = new Map();
  let history = [];
  let pos = 0;

  function getAst(raw) {
    if (!astCache.has(raw)) {
      let ast;
      try { ast = parse(raw.slice(1)); } catch { ast = null; }
      astCache.set(raw, ast);
    }
    return astCache.get(raw);
  }

  function recompute() {
    dirty = false;
    memo = new Map();
    const deps = new Map();
    for (const [key, raw] of raws) {
      if (raw.startsWith('=')) {
        const set = new Set();
        collectDeps(getAst(raw), set);
        deps.set(key, set);
      }
    }
    // Tarjan's strongly connected components.
    const index = new Map(), low = new Map(), onStack = new Set(), stack = [];
    const inCycle = new Set();
    let counter = 0;
    const strong = (v) => {
      index.set(v, counter); low.set(v, counter); counter++;
      stack.push(v); onStack.add(v);
      for (const w of deps.get(v) || []) {
        if (!deps.has(w)) continue;
        if (!index.has(w)) { strong(w); low.set(v, Math.min(low.get(v), low.get(w))); }
        else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
      }
      if (low.get(v) === index.get(v)) {
        const comp = [];
        let w;
        do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== v);
        if (comp.length > 1 || deps.get(v).has(v)) comp.forEach((x) => inCycle.add(x));
      }
    };
    for (const v of deps.keys()) if (!index.has(v)) strong(v);
    // Everything depending on a cycle cell is also #CYCLE!.
    const rev = new Map();
    for (const [v, ds] of deps) {
      for (const w of ds) {
        if (!rev.has(w)) rev.set(w, []);
        rev.get(w).push(v);
      }
    }
    const queue = [...inCycle];
    while (queue.length) {
      const w = queue.pop();
      for (const v of rev.get(w) || []) {
        if (!inCycle.has(v)) { inCycle.add(v); queue.push(v); }
      }
    }
    cycleCells = inCycle;
  }

  function cellValue(key) {
    const raw = raws.get(key);
    if (raw === undefined || raw === '') return EMPTY;
    if (!raw.startsWith('=')) {
      if (NUMBER_RE.test(raw)) return parseFloat(raw.trim());
      return raw;
    }
    if (cycleCells.has(key)) return ERR['#CYCLE!'];
    if (memo.has(key)) return memo.get(key);
    const ast = getAst(raw);
    let v;
    if (!ast) v = ERR['#ERROR!'];
    else {
      v = ev(ast);
      if (v instanceof Range) v = ERR['#VALUE!'];
      else if (v === EMPTY) v = 0;
    }
    memo.set(key, v);
    return v;
  }

  function ev(node) {
    switch (node.k) {
      case 'num': case 'str': case 'bool': return node.v;
      case 'err': return ERR[node.v];
      case 'name': return ERR['#NAME?'];
      case 'ref':
        return node.tok.valid ? cellValue(keyOf(node.tok.c, node.tok.r)) : ERR['#REF!'];
      case 'range': return new Range(node.a.c, node.a.r, node.b.c, node.b.r);
      case 'un': {
        const x = ev(node.x);
        if (x instanceof Range) return ERR['#VALUE!'];
        const n = toNum(x);
        if (isErr(n)) return n;
        return node.op === '-' ? -n : n;
      }
      case 'bin': return evBinary(node);
      case 'func': return evFunc(node);
    }
    return ERR['#ERROR!'];
  }

  function evBinary(node) {
    const l = ev(node.l);
    if (isErr(l)) return l;
    const r = ev(node.r);
    if (isErr(r)) return r;
    if (l instanceof Range || r instanceof Range) return ERR['#VALUE!'];
    const op = node.op;
    if (op === '&') return toText(l) + toText(r);
    if (['=', '<>', '<', '>', '<=', '>='].includes(op)) return compare(op, l, r);
    const a = toNum(l);
    if (isErr(a)) return a;
    const b = toNum(r);
    if (isErr(b)) return b;
    let res;
    switch (op) {
      case '+': res = a + b; break;
      case '-': res = a - b; break;
      case '*': res = a * b; break;
      case '/':
        if (b === 0) return ERR['#DIV/0!'];
        res = a / b;
        break;
      case '^':
        if (a === 0 && b < 0) return ERR['#DIV/0!'];
        res = Math.pow(a, b);
        break;
    }
    if (!Number.isFinite(res)) return ERR['#VALUE!'];
    return res;
  }

  // Gathers the numbers of aggregate-function arguments; returns an array or an Err.
  function gatherNumbers(args, strict) {
    const nums = [];
    for (const arg of args) {
      let v = ev(arg);
      if (isErr(v)) return v;
      if (v instanceof Range || arg.k === 'ref') {
        const keys = v instanceof Range ? v.keys() : [keyOf(arg.tok.c, arg.tok.r)];
        for (const k of keys) {
          const cv = k === undefined ? EMPTY : cellValue(k);
          if (isErr(cv)) return cv;
          if (typeof cv === 'number') nums.push(cv);
        }
        continue;
      }
      if (typeof v === 'number') nums.push(v);
      else if (typeof v === 'boolean') nums.push(v ? 1 : 0);
      else if (typeof v === 'string' && strict) return ERR['#VALUE!'];
    }
    return nums;
  }

  function evFunc(node) {
    const args = node.args;
    switch (node.name) {
      case 'SUM': case 'AVERAGE': case 'MIN': case 'MAX': case 'COUNT': {
        const nums = gatherNumbers(args, node.name !== 'COUNT');
        if (isErr(nums)) return nums;
        switch (node.name) {
          case 'SUM': return nums.reduce((s, n) => s + n, 0);
          case 'AVERAGE':
            if (!nums.length) return ERR['#DIV/0!'];
            return nums.reduce((s, n) => s + n, 0) / nums.length;
          case 'MIN': return nums.length ? Math.min(...nums) : 0;
          case 'MAX': return nums.length ? Math.max(...nums) : 0;
          default: return nums.length;
        }
      }
      case 'IF': {
        if (args.length < 2 || args.length > 3) return ERR['#ERROR!'];
        const c = ev(args[0]);
        if (isErr(c)) return c;
        if (c instanceof Range) return ERR['#VALUE!'];
        const b = toBool(c);
        if (isErr(b)) return b;
        if (b) return ev(args[1]);
        return args.length === 3 ? ev(args[2]) : false;
      }
      case 'ROUND': {
        if (args.length < 1 || args.length > 2) return ERR['#ERROR!'];
        const x = scalarNum(args[0]);
        if (isErr(x)) return x;
        const d = args.length === 2 ? scalarNum(args[1]) : 0;
        if (isErr(d)) return d;
        return roundHalfAway(x, d);
      }
      case 'ABS': {
        if (args.length !== 1) return ERR['#ERROR!'];
        const x = scalarNum(args[0]);
        if (isErr(x)) return x;
        return Math.abs(x);
      }
      default:
        return ERR['#NAME?'];
    }
  }

  function scalarNum(node) {
    const v = ev(node);
    if (v instanceof Range) return ERR['#VALUE!'];
    return toNum(v);
  }

  function value(ref) {
    const p = parseRef(ref);
    if (!p) return ERR['#REF!'];
    if (dirty) recompute();
    return cellValue(p.key);
  }

  function writeRaw(key, raw) {
    if (raw === '') raws.delete(key);
    else raws.set(key, raw);
    dirty = true;
  }

  function record(changes) {
    history.length = pos;
    history.push(changes);
    if (history.length > MAX_UNDO) history.shift();
    pos = history.length;
  }

  function change(key, raw) {
    const before = raws.get(key) || '';
    writeRaw(key, raw);
    record([{ key, before, after: raw }]);
  }

  function display(ref) {
    const v = value(ref);
    if (v === EMPTY) return '';
    if (isErr(v)) return v.code;
    return toText(v);
  }

  return {
    set(ref, raw) {
      const p = parseRef(ref);
      if (!p) return;
      change(p.key, raw == null ? '' : String(raw));
    },
    get(ref) {
      const v = value(ref);
      if (v === EMPTY) return '';
      if (isErr(v)) return v.code;
      return v;
    },
    raw(ref) {
      const p = parseRef(ref);
      return p ? raws.get(p.key) || '' : '';
    },
    display,
    copy(from, to) {
      const a = parseRef(from), b = parseRef(to);
      if (!a || !b) return;
      let raw = raws.get(a.key) || '';
      if (raw.startsWith('=')) raw = shiftFormula(raw, b.c - a.c, b.r - a.r);
      change(b.key, raw);
    },
    undo() {
      if (pos === 0) return false;
      pos--;
      for (const ch of history[pos]) writeRaw(ch.key, ch.before);
      return true;
    },
    redo() {
      if (pos >= history.length) return false;
      for (const ch of history[pos]) writeRaw(ch.key, ch.after);
      pos++;
      return true;
    },
    toCSV() {
      let maxR = -1, maxC = -1;
      for (const key of raws.keys()) {
        const p = parseRef(key);
        maxR = Math.max(maxR, p.r);
        maxC = Math.max(maxC, p.c);
      }
      const lines = [];
      for (let r = 0; r <= maxR; r++) {
        const fields = [];
        for (let c = 0; c <= maxC; c++) {
          const s = display(keyOf(c, r));
          fields.push(/[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
        }
        lines.push(fields.join(','));
      }
      return lines.join('\n');
    },
    // Raw text of all non-empty cells, e.g. for saving.
    dump() {
      return Object.fromEntries(raws);
    },
    // Loads raw cell text without recording undo steps.
    load(data) {
      raws.clear();
      history = [];
      pos = 0;
      for (const [ref, raw] of Object.entries(data || {})) {
        const p = parseRef(ref);
        if (p && typeof raw === 'string' && raw !== '') raws.set(p.key, raw);
      }
      dirty = true;
    },
  };
}
