// Spreadsheet engine: cell storage, formula parsing and evaluation, undo/redo, CSV export.
// No DOM code here, so tests can import this module directly.

export const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const ROWS = 30;

const HISTORY_LIMIT = 100;
const ERRORS = {
  DIV0: '#DIV/0!',
  REF: '#REF!',
  NAME: '#NAME?',
  VALUE: '#VALUE!',
  CYCLE: '#CYCLE!',
  ERROR: '#ERROR!',
};
const CMP_OPS = ['=', '<>', '<', '>', '<=', '>='];
const OP_CHARS = '+-*/^&=<>(),:';
const NUMBER_RE = /^\s*[+-]?(\d+\.?\d*|\.\d+)\s*$/;
const REF_RE = /^(\$?)([A-Za-z]+)(\$?)(\d+)$/;

// An error value inside evaluation. Plain JS strings are text, so typed text like "#REF!" stays text.
class SheetError {
  constructor(code) {
    this.code = code;
  }
}

class ParseError extends Error {}

function colIndex(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64;
  return n;
}

function colLetters(n) {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

// Parses "$A$1", "a1", "K30" ... and reports whether it is inside the grid.
function parseRef(text) {
  const m = REF_RE.exec(text);
  if (!m) return null;
  const col = colIndex(m[2]);
  const row = Number(m[4]);
  return {
    col,
    row,
    colAbs: m[1] === '$',
    rowAbs: m[3] === '$',
    valid: col >= 1 && col <= COLUMNS.length && row >= 1 && row <= ROWS,
    key: `${colLetters(col)}${row}`,
  };
}

// Returns the parsed reference for a valid cell reference string, otherwise null.
function cellKey(ref) {
  const p = typeof ref === 'string' ? parseRef(ref) : null;
  return p && p.valid ? p : null;
}

function displayNumber(n) {
  return String(Number(n.toFixed(10)));
}

function toText(v) {
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return displayNumber(v);
  return v;
}

function displayValue(v) {
  return v instanceof SheetError ? v.code : toText(v);
}

function toNumber(v) {
  if (v instanceof SheetError) return v;
  if (v === null) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return v;
  return new SheetError(ERRORS.VALUE);
}

function truthy(v) {
  if (v instanceof SheetError) return v;
  if (v === null) return false;
  if (typeof v === 'string') return new SheetError(ERRORS.VALUE);
  return v !== 0 && v !== false;
}

function emptyAs(v) {
  if (typeof v === 'number') return 0;
  if (typeof v === 'boolean') return false;
  return '';
}

// Comparison. Empty cells take the type of the other operand.
function compareValues(l, r, op) {
  if (l === null && r === null) {
    l = '';
    r = '';
  } else if (l === null) {
    l = emptyAs(r);
  } else if (r === null) {
    r = emptyAs(l);
  }
  const isNum = (v) => typeof v === 'number' || typeof v === 'boolean';
  let a;
  let b;
  if (isNum(l) && isNum(r)) {
    a = Number(l);
    b = Number(r);
  } else if (typeof l === 'string' && typeof r === 'string') {
    a = l.toLowerCase();
    b = r.toLowerCase();
  } else if (op === '=') {
    return false;
  } else if (op === '<>') {
    return true;
  } else {
    return new SheetError(ERRORS.VALUE);
  }
  switch (op) {
    case '=':
      return a === b;
    case '<>':
      return a !== b;
    case '<':
      return a < b;
    case '>':
      return a > b;
    case '<=':
      return a <= b;
    default:
      return a >= b;
  }
}

function evalBinary(node, ctx) {
  const l = evalNode(node.l, ctx);
  const r = evalNode(node.r, ctx);
  if (l instanceof SheetError) return l;
  if (r instanceof SheetError) return r;
  const op = node.op;
  if (op === '&') return toText(l) + toText(r);
  if (CMP_OPS.includes(op)) return compareValues(l, r, op);

  const a = toNumber(l);
  if (a instanceof SheetError) return a;
  const b = toNumber(r);
  if (b instanceof SheetError) return b;
  let res;
  switch (op) {
    case '+':
      res = a + b;
      break;
    case '-':
      res = a - b;
      break;
    case '*':
      res = a * b;
      break;
    case '/':
      if (b === 0) return new SheetError(ERRORS.DIV0);
      res = a / b;
      break;
    default:
      if (a === 0 && b < 0) return new SheetError(ERRORS.DIV0);
      res = Math.pow(a, b);
  }
  return Number.isFinite(res) ? res : new SheetError(ERRORS.VALUE);
}

// Cell keys covered by a reference node, row by row, or null if a corner is outside the grid.
function refKeys(node) {
  if (node.t === 'ref') return node.valid ? [node.key] : null;
  const { a, b } = node;
  if (!a.valid || !b.valid) return null;
  const keys = [];
  for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
    for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
      keys.push(`${colLetters(c)}${r}`);
    }
  }
  return keys;
}

// Numbers from the arguments of SUM, AVERAGE, MIN, MAX and COUNT.
// Ranges and references skip text and empty cells; scalar text is #VALUE! unless countOnly.
function gatherNumbers(args, ctx, countOnly) {
  const nums = [];
  for (const arg of args) {
    if (arg.t === 'ref' || arg.t === 'range') {
      const keys = refKeys(arg);
      if (!keys) return new SheetError(ERRORS.REF);
      for (const key of keys) {
        const v = ctx.cellValue(key);
        if (v instanceof SheetError) return v;
        if (typeof v === 'number') nums.push(v);
      }
      continue;
    }
    const v = evalNode(arg, ctx);
    if (v instanceof SheetError) return v;
    if (typeof v === 'number') nums.push(v);
    else if (typeof v === 'boolean') nums.push(v ? 1 : 0);
    else if (typeof v === 'string' && !countOnly) return new SheetError(ERRORS.VALUE);
  }
  return nums;
}

function shiftExp(x, k) {
  const [mantissa, exp = '0'] = String(x).split('e');
  return Number(`${mantissa}e${Number(exp) + k}`);
}

// Rounds half away from zero, using decimal shifts to avoid binary rounding errors.
function roundHalfAway(x, digits) {
  const sign = x < 0 ? -1 : 1;
  return sign * shiftExp(Math.round(shiftExp(Math.abs(x), digits)), -digits);
}

function hasArgs(args, min, max) {
  return args.length >= min && args.length <= max;
}

const ARITY_ERROR = new SheetError(ERRORS.ERROR);

const FUNCTIONS = {
  SUM(args, ctx) {
    const nums = gatherNumbers(args, ctx, false);
    return nums instanceof SheetError ? nums : nums.reduce((s, n) => s + n, 0);
  },
  AVERAGE(args, ctx) {
    const nums = gatherNumbers(args, ctx, false);
    if (nums instanceof SheetError) return nums;
    if (nums.length === 0) return new SheetError(ERRORS.DIV0);
    return nums.reduce((s, n) => s + n, 0) / nums.length;
  },
  MIN(args, ctx) {
    const nums = gatherNumbers(args, ctx, false);
    if (nums instanceof SheetError) return nums;
    return nums.length ? Math.min(...nums) : 0;
  },
  MAX(args, ctx) {
    const nums = gatherNumbers(args, ctx, false);
    if (nums instanceof SheetError) return nums;
    return nums.length ? Math.max(...nums) : 0;
  },
  COUNT(args, ctx) {
    const nums = gatherNumbers(args, ctx, true);
    return nums instanceof SheetError ? nums : nums.length;
  },
  IF(args, ctx) {
    if (!hasArgs(args, 2, 3)) return ARITY_ERROR;
    const cond = truthy(evalNode(args[0], ctx));
    if (cond instanceof SheetError) return cond;
    if (cond) return evalNode(args[1], ctx);
    return args.length === 3 ? evalNode(args[2], ctx) : false;
  },
  ROUND(args, ctx) {
    if (!hasArgs(args, 1, 2)) return ARITY_ERROR;
    const x = toNumber(evalNode(args[0], ctx));
    if (x instanceof SheetError) return x;
    const digits = args.length === 2 ? toNumber(evalNode(args[1], ctx)) : 0;
    if (digits instanceof SheetError) return digits;
    return roundHalfAway(x, Math.trunc(digits));
  },
  ABS(args, ctx) {
    if (!hasArgs(args, 1, 1)) return ARITY_ERROR;
    const x = toNumber(evalNode(args[0], ctx));
    return x instanceof SheetError ? x : Math.abs(x);
  },
};

function evalNode(node, ctx) {
  switch (node.t) {
    case 'num':
    case 'str':
    case 'bool':
      return node.v;
    case 'err':
      return new SheetError(node.code);
    case 'name':
      return new SheetError(ERRORS.NAME);
    case 'ref':
      return node.valid ? ctx.cellValue(node.key) : new SheetError(ERRORS.REF);
    case 'range':
      return new SheetError(refKeys(node) ? ERRORS.VALUE : ERRORS.REF);
    case 'un': {
      const v = toNumber(evalNode(node.e, ctx));
      if (v instanceof SheetError) return v;
      return node.op === '-' ? -v : v;
    }
    case 'bin':
      return evalBinary(node, ctx);
    case 'call':
      if (!Object.prototype.hasOwnProperty.call(FUNCTIONS, node.name)) return new SheetError(ERRORS.NAME);
      return FUNCTIONS[node.name](node.args, ctx);
    default:
      return new SheetError(ERRORS.ERROR);
  }
}

// ---- Tokenizer and parser ----

function tokenize(src, from = 0) {
  const tokens = [];
  let i = from;
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
        if (i >= src.length) throw new ParseError('unterminated string');
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
      tokens.push({ type: 'str', value: text, start, end: i });
    } else if (/\d/.test(ch) || (ch === '.' && /\d/.test(src[i + 1] ?? ''))) {
      const m = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
      i += m[0].length;
      tokens.push({ type: 'num', value: Number(m[0]), start, end: i });
    } else if (src.startsWith('#REF!', i)) {
      // Written by copy() when a moved reference leaves the grid.
      i += 5;
      tokens.push({ type: 'err', value: ERRORS.REF, start, end: i });
    } else if (/[A-Za-z_$]/.test(ch)) {
      const word = /^[\w$]+/.exec(src.slice(i))[0];
      i += word.length;
      let j = i;
      while (j < src.length && /\s/.test(src[j])) j++;
      if (src[j] === '(') {
        if (!/^[A-Za-z]+$/.test(word)) throw new ParseError('bad function name');
        tokens.push({ type: 'func', value: word.toUpperCase(), start, end: i });
      } else if (REF_RE.test(word)) {
        tokens.push({ type: 'ref', value: word, start, end: i });
      } else if (/^(TRUE|FALSE)$/i.test(word)) {
        tokens.push({ type: 'bool', value: word.toUpperCase() === 'TRUE', start, end: i });
      } else {
        tokens.push({ type: 'name', value: word, start, end: i });
      }
    } else {
      const two = src.substr(i, 2);
      if (two === '<>' || two === '<=' || two === '>=') {
        tokens.push({ type: 'op', value: two, start, end: i + 2 });
        i += 2;
      } else if (OP_CHARS.includes(ch)) {
        tokens.push({ type: 'op', value: ch, start, end: i + 1 });
        i++;
      } else {
        throw new ParseError(`unexpected character ${ch}`);
      }
    }
  }
  return tokens;
}

function refNode(text) {
  const p = parseRef(text);
  return { t: 'ref', valid: p.valid, key: p.key, col: p.col, row: p.row };
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  isOp(value) {
    const tok = this.tokens[this.pos];
    return tok !== undefined && tok.type === 'op' && tok.value === value;
  }

  expect(value) {
    if (!this.isOp(value)) throw new ParseError(`expected ${value}`);
    this.pos++;
  }

  // Left-associative level: operand (op operand)*
  binary(ops, operand) {
    let left = operand();
    while (this.tokens[this.pos]?.type === 'op' && ops.includes(this.tokens[this.pos].value)) {
      const op = this.tokens[this.pos++].value;
      left = { t: 'bin', op, l: left, r: operand() };
    }
    return left;
  }

  comparison() {
    return this.binary(CMP_OPS, () => this.concat());
  }

  concat() {
    return this.binary(['&'], () => this.additive());
  }

  additive() {
    return this.binary(['+', '-'], () => this.multiplicative());
  }

  multiplicative() {
    return this.binary(['*', '/'], () => this.unary());
  }

  unary() {
    if (this.isOp('-') || this.isOp('+')) {
      const op = this.tokens[this.pos++].value;
      return { t: 'un', op, e: this.unary() };
    }
    return this.power();
  }

  // ^ is right-associative and binds tighter than unary minus: -2^2 is -4.
  power() {
    const base = this.primary();
    if (this.isOp('^')) {
      this.pos++;
      return { t: 'bin', op: '^', l: base, r: this.powerOperand() };
    }
    return base;
  }

  powerOperand() {
    if (this.isOp('-') || this.isOp('+')) {
      const op = this.tokens[this.pos++].value;
      return { t: 'un', op, e: this.powerOperand() };
    }
    return this.power();
  }

  primary() {
    const tok = this.tokens[this.pos++];
    if (!tok) throw new ParseError('unexpected end of formula');
    switch (tok.type) {
      case 'num':
      case 'str':
      case 'bool':
        return { t: tok.type, v: tok.value };
      case 'err':
        return { t: 'err', code: tok.value };
      case 'name':
        return { t: 'name' };
      case 'ref':
        return this.reference(tok.value);
      case 'func':
        return this.call(tok.value);
      case 'op':
        if (tok.value === '(') {
          const e = this.comparison();
          this.expect(')');
          return e;
        }
    }
    throw new ParseError('unexpected token');
  }

  reference(text) {
    const first = refNode(text);
    if (this.isOp(':') && this.tokens[this.pos + 1]?.type === 'ref') {
      this.pos++;
      return { t: 'range', a: first, b: refNode(this.tokens[this.pos++].value) };
    }
    return first;
  }

  call(name) {
    this.expect('(');
    const args = [];
    if (!this.isOp(')')) {
      args.push(this.comparison());
      while (this.isOp(',')) {
        this.pos++;
        args.push(this.comparison());
      }
    }
    this.expect(')');
    return { t: 'call', name, args };
  }
}

function parseFormula(src) {
  const tokens = tokenize(src, 1);
  const parser = new Parser(tokens);
  const ast = parser.comparison();
  if (parser.pos !== tokens.length) throw new ParseError('unexpected token');
  return ast;
}

// Parsed formulas by raw text. Parsing does not depend on the sheet, so entries never go stale.
const astCache = new Map();

function astOf(raw) {
  if (!astCache.has(raw)) {
    let ast = null;
    try {
      ast = parseFormula(raw);
    } catch (e) {
      if (!(e instanceof ParseError)) throw e;
    }
    astCache.set(raw, ast);
  }
  return astCache.get(raw);
}

// Cell keys a formula refers to (valid references only), whether or not IF evaluates them.
function collectDeps(node, out) {
  switch (node.t) {
    case 'ref':
    case 'range': {
      const keys = refKeys(node);
      if (keys) out.push(...keys);
      break;
    }
    case 'un':
      collectDeps(node.e, out);
      break;
    case 'bin':
      collectDeps(node.l, out);
      collectDeps(node.r, out);
      break;
    case 'call':
      for (const arg of node.args) collectDeps(arg, out);
      break;
  }
  return out;
}

// Moves one relative reference by (dc, dr). Returns null if it is invalid before or after the move.
function shiftRef(text, dc, dr) {
  const p = parseRef(text);
  if (!p.valid) return null;
  const col = p.colAbs ? p.col : p.col + dc;
  const row = p.rowAbs ? p.row : p.row + dr;
  if (col < 1 || col > COLUMNS.length || row < 1 || row > ROWS) return null;
  return `${p.colAbs ? '$' : ''}${colLetters(col)}${p.rowAbs ? '$' : ''}${row}`;
}

// Rewrites the references of a formula for a copy. Only the reference tokens change; the rest of the text is kept.
function shiftFormula(raw, dc, dr) {
  let tokens;
  try {
    tokens = tokenize(raw, 1);
  } catch (e) {
    if (e instanceof ParseError) return raw;
    throw e;
  }
  let out = '';
  let last = 0;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type !== 'ref') continue;
    const colon = tokens[i + 1];
    const end = tokens[i + 2];
    if (colon?.type === 'op' && colon.value === ':' && end?.type === 'ref') {
      const a = shiftRef(tok.value, dc, dr);
      const b = shiftRef(end.value, dc, dr);
      out += raw.slice(last, tok.start) + (a && b ? `${a}:${b}` : ERRORS.REF);
      last = end.end;
      i += 2;
    } else {
      out += raw.slice(last, tok.start) + (shiftRef(tok.value, dc, dr) ?? ERRORS.REF);
      last = tok.end;
    }
  }
  return out + raw.slice(last);
}

function csvField(text) {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createSheet() {
  let cells = new Map(); // key -> raw text; empty cells are absent
  let undoStack = [];
  let redoStack = [];
  let analysis = null; // cycle analysis, reset on every change
  let values = new Map(); // computed values, reset on every change

  const ctx = { cellValue };

  function invalidate() {
    analysis = null;
    values = new Map();
  }

  // A cell is #CYCLE! if one of the cells it can reach through references is part of a cycle.
  // Cycles are found from the references in the formulas, so IF branches that are not taken still count.
  function analyze() {
    if (analysis) return analysis;
    const deps = new Map();
    for (const [key, raw] of cells) {
      if (raw.startsWith('=')) {
        const ast = astOf(raw);
        deps.set(key, ast ? collectDeps(ast, []) : []);
      }
    }
    const reach = new Map();
    const cyclic = new Set();
    for (const key of deps.keys()) {
      const seen = new Set();
      const stack = [...deps.get(key)];
      while (stack.length) {
        const k = stack.pop();
        if (seen.has(k)) continue;
        seen.add(k);
        if (deps.has(k)) stack.push(...deps.get(k));
      }
      reach.set(key, seen);
      if (seen.has(key)) cyclic.add(key);
    }
    const tainted = new Set();
    for (const [key, seen] of reach) {
      for (const k of seen) {
        if (cyclic.has(k)) {
          tainted.add(key);
          break;
        }
      }
    }
    analysis = { tainted };
    return analysis;
  }

  function cellValue(key) {
    if (!values.has(key)) values.set(key, computeCell(key));
    return values.get(key);
  }

  function computeCell(key) {
    const raw = cells.get(key);
    if (raw === undefined) return null;
    if (!raw.startsWith('=')) return NUMBER_RE.test(raw) ? Number(raw) : raw;
    if (analyze().tainted.has(key)) return new SheetError(ERRORS.CYCLE);
    const ast = astOf(raw);
    if (!ast) return new SheetError(ERRORS.ERROR);
    const result = evalNode(ast, ctx);
    return result === null ? 0 : result;
  }

  // Stores new raw text for a cell as one undo step.
  function write(key, text) {
    undoStack.push(new Map(cells));
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
    if (text === '') cells.delete(key);
    else cells.set(key, text);
    invalidate();
  }

  function requireCell(ref) {
    const target = cellKey(ref);
    if (!target) throw new RangeError(`invalid cell reference: ${ref}`);
    return target;
  }

  return {
    set(ref, raw) {
      const target = requireCell(ref);
      write(target.key, raw == null ? '' : String(raw));
    },

    get(ref) {
      const target = cellKey(ref);
      if (!target) return ERRORS.REF;
      const v = cellValue(target.key);
      if (v instanceof SheetError) return v.code;
      return v === null ? '' : v;
    },

    raw(ref) {
      const target = cellKey(ref);
      return target ? cells.get(target.key) ?? '' : '';
    },

    display(ref) {
      const target = cellKey(ref);
      return target ? displayValue(cellValue(target.key)) : ERRORS.REF;
    },

    copy(from, to) {
      const src = requireCell(from);
      const dst = requireCell(to);
      const raw = cells.get(src.key) ?? '';
      const text = raw.startsWith('=')
        ? shiftFormula(raw, dst.col - src.col, dst.row - src.row)
        : raw;
      write(dst.key, text);
    },

    undo() {
      if (!undoStack.length) return;
      redoStack.push(new Map(cells));
      cells = undoStack.pop();
      invalidate();
    },

    redo() {
      if (!redoStack.length) return;
      undoStack.push(new Map(cells));
      cells = redoStack.pop();
      invalidate();
    },

    toCSV() {
      let lastRow = 0;
      let lastCol = 0;
      for (const key of cells.keys()) {
        const p = parseRef(key);
        lastRow = Math.max(lastRow, p.row);
        lastCol = Math.max(lastCol, p.col);
      }
      const lines = [];
      for (let r = 1; r <= lastRow; r++) {
        const fields = [];
        for (let c = 1; c <= lastCol; c++) {
          fields.push(csvField(displayValue(cellValue(`${colLetters(c)}${r}`))));
        }
        lines.push(fields.join(','));
      }
      return lines.join('\n');
    },

    // Raw texts of the non-empty cells, as a plain object. Used for saving.
    dump() {
      return Object.fromEntries(cells);
    },

    // Replaces all cells with the given raw texts and clears the undo history.
    load(data) {
      cells = new Map();
      for (const [ref, text] of Object.entries(data ?? {})) {
        const target = cellKey(ref);
        if (target && typeof text === 'string' && text !== '') cells.set(target.key, text);
      }
      undoStack = [];
      redoStack = [];
      invalidate();
    },
  };
}
