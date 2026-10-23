// Spreadsheet engine: cell storage, formula parsing and evaluation, history and CSV export.
// No DOM access here, so tests can import this module directly.

export const COLS = 10; // A..J
export const ROWS = 30; // 1..30

const MAX_HISTORY = 100;
const ARITH_OPS = new Set(['+', '-', '*', '/', '^']);
const COMPARE_LIST = ['=', '<>', '<', '>', '<=', '>='];
const CELL_NUMBER_RE = /^\s*[+-]?(\d+\.?\d*|\.\d+)\s*$/;
const LOCATE_RE = /^([A-Za-z])([1-9]\d*)$/;

// Internal value kinds: number, string, boolean, EMPTY (empty cell), XErr (error).
const EMPTY = Object.freeze({ empty: true });

class XErr {
  constructor(code) {
    this.code = code;
  }
}
const err = (code) => new XErr(code);

class SyntaxErr extends Error {}

const keyOf = (col, row) => String.fromCharCode(65 + col) + row;
const coordsOf = (key) => ({ col: key.charCodeAt(0) - 65, row: Number(key.slice(1)) });

// Plain cell name ("b3") to its normalized key ("B3"), or null when outside A1:J30.
function normRef(ref) {
  const m = LOCATE_RE.exec(String(ref));
  if (!m) return null;
  const col = m[1].toUpperCase().charCodeAt(0) - 65;
  const row = Number(m[2]);
  if (col >= COLS || row > ROWS) return null;
  return keyOf(col, row);
}

function colIndex(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function makeRef(col, row) {
  const valid = col >= 0 && col < COLS && row >= 1 && row <= ROWS;
  return { col, row, valid, key: valid ? keyOf(col, row) : null };
}

// ---------- Tokenizer and parser ----------

const REF_RE = /(\$?)([A-Za-z]+)(\$?)(\d+)/y;
const NAME_RE = /[A-Za-z_][A-Za-z_0-9.]*/y;
const NUM_RE = /\d+\.?\d*|\.\d+/y;
const ERR_RE = /#REF!/iy;
const OPS2 = ['<>', '<=', '>='];
const OPS1 = '+-*/^&=<>(),:';

function matchAt(re, src, i) {
  re.lastIndex = i;
  return re.exec(src);
}

function tokenize(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const start = i;
    if (ch === '"') {
      let text = '';
      i++;
      for (;;) {
        if (i >= src.length) throw new SyntaxErr('unterminated string');
        if (src[i] === '"') {
          if (src[i + 1] === '"') {
            text += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        text += src[i++];
      }
      toks.push({ t: 'str', v: text, start, end: i });
      continue;
    }
    if (ch === '#') {
      const m = matchAt(ERR_RE, src, i);
      if (!m) throw new SyntaxErr('bad error literal');
      i += m[0].length;
      toks.push({ t: 'err', start, end: i });
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const m = matchAt(NUM_RE, src, i);
      if (m) {
        i += m[0].length;
        toks.push({ t: 'num', v: Number(m[0]), start, end: i });
        continue;
      }
    }
    if (ch === '$' || /[A-Za-z]/.test(ch)) {
      const m = matchAt(REF_RE, src, i);
      const after = m ? src[i + m[0].length] ?? '' : '';
      if (m && after !== '(' && !/[A-Za-z0-9_]/.test(after)) {
        i += m[0].length;
        toks.push({
          t: 'ref',
          col: colIndex(m[2]),
          row: Number(m[4]),
          cabs: m[1] === '$',
          rabs: m[3] === '$',
          start,
          end: i,
        });
        continue;
      }
      const n = matchAt(NAME_RE, src, i);
      if (!n) throw new SyntaxErr('bad name');
      i += n[0].length;
      toks.push({ t: 'name', v: n[0].toUpperCase(), start, end: i });
      continue;
    }
    const two = src.substr(i, 2);
    if (OPS2.includes(two)) {
      toks.push({ t: 'op', v: two, start, end: i + 2 });
      i += 2;
      continue;
    }
    if (OPS1.includes(ch)) {
      toks.push({ t: 'op', v: ch, start, end: i + 1 });
      i++;
      continue;
    }
    throw new SyntaxErr('unexpected character');
  }
  return toks;
}

// Returns the AST for a formula body (text after "="). Throws SyntaxErr.
function parseFormula(src) {
  const toks = tokenize(src);
  let p = 0;
  const isOp = (v) => toks[p]?.t === 'op' && toks[p].v === v;
  const expect = (v) => {
    if (!isOp(v)) throw new SyntaxErr(`expected ${v}`);
    p++;
  };
  // Left-associative binary level.
  const level = (ops, next) => {
    let left = next();
    while (toks[p]?.t === 'op' && ops.includes(toks[p].v)) {
      const op = toks[p++].v;
      left = { k: 'bin', op, l: left, r: next() };
    }
    return left;
  };
  const expr = () => level(COMPARE_LIST, concat);
  const concat = () => level(['&'], additive);
  const additive = () => level(['+', '-'], multiplicative);
  const multiplicative = () => level(['*', '/'], unary);

  function unary() {
    if (isOp('-') || isOp('+')) {
      const op = toks[p++].v;
      return { k: op === '-' ? 'neg' : 'pos', e: unary() };
    }
    return power();
  }

  // Right-associative; the exponent may carry its own sign.
  function power() {
    const base = primary();
    if (isOp('^')) {
      p++;
      return { k: 'bin', op: '^', l: base, r: unary() };
    }
    return base;
  }

  function primary() {
    const t = toks[p];
    if (!t) throw new SyntaxErr('unexpected end');
    if (t.t === 'num' || t.t === 'str') {
      p++;
      return { k: 'lit', v: t.v };
    }
    if (t.t === 'err') {
      p++;
      return { k: 'err', code: '#REF!' };
    }
    if (t.t === 'ref') {
      p++;
      if (isOp(':') && toks[p + 1]?.t === 'ref') {
        const b = toks[p + 1];
        p += 2;
        return { k: 'range', a: makeRef(t.col, t.row), b: makeRef(b.col, b.row) };
      }
      return { k: 'ref', ref: makeRef(t.col, t.row) };
    }
    if (t.t === 'name') {
      p++;
      if (isOp('(')) {
        p++;
        const args = [];
        if (isOp(')')) {
          p++;
        } else {
          for (;;) {
            args.push(expr());
            if (isOp(',')) {
              p++;
              continue;
            }
            expect(')');
            break;
          }
        }
        return { k: 'call', name: t.v, args };
      }
      if (t.v === 'TRUE' || t.v === 'FALSE') return { k: 'lit', v: t.v === 'TRUE' };
      return { k: 'name', v: t.v };
    }
    if (isOp('(')) {
      p++;
      const e = expr();
      expect(')');
      return e;
    }
    throw new SyntaxErr('unexpected token');
  }

  const ast = expr();
  if (p !== toks.length) throw new SyntaxErr('unexpected token');
  return ast;
}

// Cells covered by a reference or range node, row by row; null if an endpoint is invalid.
function rangeKeys(node) {
  if (node.k === 'ref') return node.ref.valid ? [node.ref.key] : null;
  const { a, b } = node;
  if (!a.valid || !b.valid) return null;
  const keys = [];
  for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row++) {
    for (let col = Math.min(a.col, b.col); col <= Math.max(a.col, b.col); col++) {
      keys.push(keyOf(col, row));
    }
  }
  return keys;
}

// Collects every cell key a formula refers to, whether or not IF would evaluate it.
function collectKeys(node, out) {
  switch (node.k) {
    case 'ref':
    case 'range': {
      const keys = rangeKeys(node);
      if (keys) out.push(...keys);
      break;
    }
    case 'neg':
    case 'pos':
      collectKeys(node.e, out);
      break;
    case 'bin':
      collectKeys(node.l, out);
      collectKeys(node.r, out);
      break;
    case 'call':
      for (const arg of node.args) collectKeys(arg, out);
      break;
  }
}

// ---------- Copy: shift relative references ----------

function shiftRef(t, dc, dr) {
  const col = t.col + (t.cabs ? 0 : dc);
  const row = t.row + (t.rabs ? 0 : dr);
  if (col < 0 || col >= COLS || row < 1 || row > ROWS) return null;
  return `${t.cabs ? '$' : ''}${String.fromCharCode(65 + col)}${t.rabs ? '$' : ''}${row}`;
}

// Rewrites a formula so its references move by (dc, dr); moved-out references become #REF!.
function shiftFormula(raw, dc, dr) {
  const src = raw.slice(1);
  let toks;
  try {
    toks = tokenize(src);
  } catch (e) {
    if (e instanceof SyntaxErr) return raw;
    throw e;
  }
  let out = '';
  let last = 0;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t !== 'ref') continue;
    let text;
    let end = t.end;
    const sep = toks[i + 1];
    const second = toks[i + 2];
    if (sep?.t === 'op' && sep.v === ':' && second?.t === 'ref') {
      const a = shiftRef(t, dc, dr);
      const b = shiftRef(second, dc, dr);
      text = a && b ? `${a}:${b}` : '#REF!';
      end = second.end;
      i += 2;
    } else {
      text = shiftRef(t, dc, dr) ?? '#REF!';
    }
    out += src.slice(last, t.start) + text;
    last = end;
  }
  return '=' + out + src.slice(last);
}

// ---------- Value helpers ----------

function literalValue(raw) {
  return CELL_NUMBER_RE.test(raw) ? Number(raw) + 0 : raw;
}

// Numbers are rounded to 10 decimals with trailing zeros removed.
function fmtNumber(n) {
  return String(Number(n.toFixed(10)));
}

function formatValue(v) {
  if (typeof v === 'number') return fmtNumber(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return v;
}

function publicValue(v) {
  if (v === EMPTY) return '';
  if (v instanceof XErr) return v.code;
  return v;
}

function toNum(v) {
  if (v instanceof XErr) return v;
  if (v === EMPTY) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') return err('#VALUE!');
  return v;
}

function toText(v) {
  return v === EMPTY ? '' : formatValue(v);
}

function truthy(v) {
  if (v instanceof XErr) return v;
  if (v === EMPTY) return false;
  if (typeof v === 'string') return err('#VALUE!');
  return typeof v === 'number' ? v !== 0 : v;
}

// Normalizes -0 to 0; non-finite results become #ERROR!.
function numResult(r) {
  return Number.isFinite(r) ? r + 0 : err('#ERROR!');
}

function roundHalfAway(x, digits) {
  const ax = Math.abs(x);
  const scale = 10 ** Math.abs(digits);
  // toPrecision(15) removes binary noise such as 1.005 * 100 = 100.49999999999999.
  const rounded =
    digits >= 0
      ? Math.round(Number((ax * scale).toPrecision(15))) / scale
      : Math.round(Number((ax / scale).toPrecision(15))) * scale;
  return x < 0 ? -rounded : rounded;
}

function compare(op, a, b) {
  if (a === EMPTY) a = typeof b === 'string' ? '' : 0;
  if (b === EMPTY) b = typeof a === 'string' ? '' : 0;
  if (op === '=' || op === '<>') {
    const same =
      typeof a === 'string' && typeof b === 'string'
        ? a.toLowerCase() === b.toLowerCase()
        : typeof a === typeof b && a === b;
    return op === '=' ? same : !same;
  }
  if (typeof a === 'string' || typeof b === 'string') {
    if (typeof a !== 'string' || typeof b !== 'string') return err('#VALUE!');
    a = a.toLowerCase();
    b = b.toLowerCase();
  } else {
    a = toNum(a);
    b = toNum(b);
  }
  switch (op) {
    case '<':
      return a < b;
    case '>':
      return a > b;
    case '<=':
      return a <= b;
    case '>=':
      return a >= b;
  }
  return err('#ERROR!');
}

function csvField(s) {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------- Sheet ----------

export function createSheet() {
  const cells = new Map(); // key -> raw text, only for non-empty cells
  const undoStack = [];
  const redoStack = [];
  let valueCache = new Map();
  let astCache = new Map();
  let cycleCache = null;

  // Any change to the cells invalidates everything derived from them.
  function invalidate() {
    valueCache = new Map();
    astCache = new Map();
    cycleCache = null;
  }

  function astOf(key) {
    if (!astCache.has(key)) {
      let ast = null;
      try {
        ast = parseFormula(cells.get(key).slice(1));
      } catch (e) {
        if (!(e instanceof SyntaxErr)) throw e;
      }
      astCache.set(key, ast);
    }
    return astCache.get(key);
  }

  // Cells on a reference cycle, plus every cell that depends on one.
  function cycleSet() {
    if (cycleCache) return cycleCache;
    const edges = new Map();
    for (const key of cells.keys()) {
      if (!cells.get(key).startsWith('=')) continue;
      const out = [];
      const ast = astOf(key);
      if (ast) collectKeys(ast, out);
      edges.set(key, out);
    }
    const reach = new Map();
    for (const [key, out] of edges) {
      const seen = new Set();
      const stack = [...out];
      while (stack.length) {
        const n = stack.pop();
        if (seen.has(n)) continue;
        seen.add(n);
        if (edges.has(n)) stack.push(...edges.get(n));
      }
      reach.set(key, seen);
    }
    const looped = new Set();
    for (const [key, seen] of reach) if (seen.has(key)) looped.add(key);
    const result = new Set();
    for (const [key, seen] of reach) {
      for (const n of seen) {
        if (looped.has(n)) {
          result.add(key);
          break;
        }
      }
    }
    cycleCache = result;
    return result;
  }

  // Internal value of a cell (may be EMPTY or XErr).
  function cellValue(key) {
    if (cycleSet().has(key)) return err('#CYCLE!');
    if (!valueCache.has(key)) {
      const raw = cells.get(key);
      let v;
      if (raw === undefined) v = EMPTY;
      else if (raw.startsWith('=')) v = evalFormula(key);
      else v = literalValue(raw);
      valueCache.set(key, v);
    }
    return valueCache.get(key);
  }

  function evalFormula(key) {
    const ast = astOf(key);
    if (!ast) return err('#ERROR!');
    const v = evalNode(ast);
    return v === EMPTY ? 0 : v;
  }

  function evalBinary(node) {
    const a = evalNode(node.l);
    if (a instanceof XErr) return a;
    if (ARITH_OPS.has(node.op)) {
      const x = toNum(a);
      if (x instanceof XErr) return x;
      const b = evalNode(node.r);
      if (b instanceof XErr) return b;
      const y = toNum(b);
      if (y instanceof XErr) return y;
      switch (node.op) {
        case '+':
          return numResult(x + y);
        case '-':
          return numResult(x - y);
        case '*':
          return numResult(x * y);
        case '/':
          return y === 0 ? err('#DIV/0!') : numResult(x / y);
        case '^':
          return x === 0 && y < 0 ? err('#DIV/0!') : numResult(x ** y);
      }
    }
    const b = evalNode(node.r);
    if (b instanceof XErr) return b;
    if (node.op === '&') return toText(a) + toText(b);
    return compare(node.op, a, b);
  }

  function evalNode(node) {
    switch (node.k) {
      case 'lit':
        return node.v;
      case 'err':
        return err(node.code);
      case 'name':
        return err('#NAME?');
      case 'ref':
        return node.ref.valid ? cellValue(node.ref.key) : err('#REF!');
      case 'range':
        return err(rangeKeys(node) ? '#VALUE!' : '#REF!');
      case 'neg':
      case 'pos': {
        const x = toNum(evalNode(node.e));
        if (x instanceof XErr) return x;
        return numResult(node.k === 'neg' ? -x : x);
      }
      case 'bin':
        return evalBinary(node);
      case 'call':
        return callFunction(node);
    }
    return err('#ERROR!');
  }

  // Numbers from the arguments, in order. Ranges and references skip non-numbers;
  // direct text arguments are #VALUE! unless strictText is false.
  function gather(args, strictText) {
    const nums = [];
    for (const arg of args) {
      if (arg.k === 'ref' || arg.k === 'range') {
        const keys = rangeKeys(arg);
        if (!keys) return err('#REF!');
        for (const key of keys) {
          const v = cellValue(key);
          if (v instanceof XErr) return v;
          if (typeof v === 'number') nums.push(v);
        }
        continue;
      }
      const v = evalNode(arg);
      if (v instanceof XErr) return v;
      if (typeof v === 'number') nums.push(v);
      else if (typeof v === 'boolean') nums.push(v ? 1 : 0);
      else if (typeof v === 'string' && strictText) return err('#VALUE!');
    }
    return nums;
  }

  const numericFn = (reduce) => (args) => {
    const nums = gather(args, true);
    return nums instanceof XErr ? nums : reduce(nums);
  };
  const scalar = (node) => toNum(evalNode(node));

  const FUNCTIONS = {
    SUM: numericFn((n) => numResult(n.reduce((s, x) => s + x, 0))),
    AVERAGE: numericFn((n) =>
      n.length ? numResult(n.reduce((s, x) => s + x, 0) / n.length) : err('#DIV/0!'),
    ),
    MIN: numericFn((n) => numResult(n.length ? Math.min(...n) : 0)),
    MAX: numericFn((n) => numResult(n.length ? Math.max(...n) : 0)),
    COUNT: (args) => {
      const nums = gather(args, false);
      return nums instanceof XErr ? nums : nums.length;
    },
    IF: (args) => {
      if (args.length < 2 || args.length > 3) return err('#ERROR!');
      const c = truthy(evalNode(args[0]));
      if (c instanceof XErr) return c;
      if (c) return evalNode(args[1]);
      return args.length === 3 ? evalNode(args[2]) : false;
    },
    ROUND: (args) => {
      if (args.length < 1 || args.length > 2) return err('#ERROR!');
      const x = scalar(args[0]);
      if (x instanceof XErr) return x;
      const d = args.length === 2 ? scalar(args[1]) : 0;
      if (d instanceof XErr) return d;
      return numResult(roundHalfAway(x, Math.trunc(d)));
    },
    ABS: (args) => {
      if (args.length !== 1) return err('#ERROR!');
      const x = scalar(args[0]);
      return x instanceof XErr ? x : numResult(Math.abs(x));
    },
  };

  function callFunction(node) {
    if (!Object.hasOwn(FUNCTIONS, node.name)) return err('#NAME?');
    return FUNCTIONS[node.name](node.args);
  }

  function displayOf(key) {
    return formatValue(publicValue(cellValue(key)));
  }

  function pushHistory() {
    undoStack.push(new Map(cells));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
  }

  function setRaw(key, text) {
    if (text === '') cells.delete(key);
    else cells.set(key, text);
    invalidate();
  }

  function restore(snapshot) {
    cells.clear();
    for (const [key, raw] of snapshot) cells.set(key, raw);
    invalidate();
  }

  return {
    set(ref, raw) {
      const key = normRef(ref);
      if (!key) throw new RangeError(`Invalid cell reference: ${ref}`);
      pushHistory();
      setRaw(key, raw == null ? '' : String(raw));
    },

    get(ref) {
      const key = normRef(ref);
      return key ? publicValue(cellValue(key)) : '#REF!';
    },

    raw(ref) {
      const key = normRef(ref);
      return key ? cells.get(key) ?? '' : '';
    },

    display(ref) {
      const key = normRef(ref);
      return key ? displayOf(key) : '#REF!';
    },

    copy(from, to) {
      const src = normRef(from);
      const dst = normRef(to);
      if (!src || !dst) throw new RangeError(`Invalid cell reference: ${src ? to : from}`);
      const raw = cells.get(src) ?? '';
      const a = coordsOf(src);
      const b = coordsOf(dst);
      const text = raw.startsWith('=') ? shiftFormula(raw, b.col - a.col, b.row - a.row) : raw;
      pushHistory();
      setRaw(dst, text);
    },

    undo() {
      if (!undoStack.length) return false;
      redoStack.push(new Map(cells));
      restore(undoStack.pop());
      return true;
    },

    redo() {
      if (!redoStack.length) return false;
      undoStack.push(new Map(cells));
      restore(redoStack.pop());
      return true;
    },

    toCSV() {
      let lastRow = 0;
      let lastCol = -1;
      for (const key of cells.keys()) {
        const { col, row } = coordsOf(key);
        lastRow = Math.max(lastRow, row);
        lastCol = Math.max(lastCol, col);
      }
      const lines = [];
      for (let row = 1; row <= lastRow; row++) {
        const fields = [];
        for (let col = 0; col <= lastCol; col++) fields.push(csvField(displayOf(keyOf(col, row))));
        lines.push(fields.join(','));
      }
      return lines.join('\n');
    },

    // Raw text of every non-empty cell, as a plain object keyed by reference.
    entries() {
      return Object.fromEntries(cells);
    },

    // Replaces all contents with saved raw text (e.g. from localStorage); clears history.
    load(data) {
      if (!data || typeof data !== 'object') return;
      cells.clear();
      for (const [ref, raw] of Object.entries(data)) {
        const key = normRef(ref);
        if (key && typeof raw === 'string' && raw !== '') cells.set(key, raw);
      }
      undoStack.length = 0;
      redoStack.length = 0;
      invalidate();
    },
  };
}
