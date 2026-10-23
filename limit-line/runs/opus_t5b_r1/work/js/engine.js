// Spreadsheet engine: no DOM code.

export const COLS = "ABCDEFGHIJ";
export const NROWS = 30;
const MAX_HISTORY = 100;

class Err {
  constructor(code) { this.code = code; }
}
const DIV0 = new Err("#DIV/0!");
const REF = new Err("#REF!");
const NAME = new Err("#NAME?");
const VALUE = new Err("#VALUE!");
const CYCLE = new Err("#CYCLE!");
const ERROR = new Err("#ERROR!");
const EMPTY = Symbol("empty");

const NUMBER_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const REF_RE = /^\$?([A-Za-z]+)\$?(\d+)$/;

// ---------- references ----------

function parseCellRef(ref) {
  if (typeof ref !== "string") return null;
  const m = /^([A-Za-z])(\d+)$/.exec(ref.trim());
  if (!m) return null;
  const c = COLS.indexOf(m[1].toUpperCase());
  const r = Number(m[2]);
  if (c < 0 || r < 1 || r > NROWS) return null;
  return { c, r, key: COLS[c] + r };
}

function makeRefNode(text) {
  const m = REF_RE.exec(text);
  const node = { k: "ref", valid: false };
  if (!m) return node;
  const letters = m[1].toUpperCase();
  const r = Number(m[2]);
  const c = letters.length === 1 ? COLS.indexOf(letters) : -1;
  if (c < 0 || r < 1 || r > NROWS) return node;
  node.valid = true;
  node.c = c;
  node.r = r;
  node.key = COLS[c] + r;
  return node;
}

function rangeKeys(node) {
  const { a, b } = node;
  const c1 = Math.min(a.c, b.c), c2 = Math.max(a.c, b.c);
  const r1 = Math.min(a.r, b.r), r2 = Math.max(a.r, b.r);
  const keys = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) keys.push(COLS[c] + r);
  }
  return keys;
}

// ---------- tokenizer & parser ----------

class ParseError extends Error {}

function tokenize(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') {
      let j = i + 1, s = "";
      for (;;) {
        if (j >= src.length) throw new ParseError("unterminated string");
        if (src[j] === '"') {
          if (src[j + 1] === '"') { s += '"'; j += 2; continue; }
          break;
        }
        s += src[j++];
      }
      toks.push({ t: "str", v: s });
      i = j + 1;
      continue;
    }
    const rest = src.slice(i);
    let m;
    if ((m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest))) {
      toks.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if ((m = /^#REF!/i.exec(rest))) {
      toks.push({ t: "badref" });
      i += m[0].length;
      continue;
    }
    if ((m = /^[A-Za-z_$][A-Za-z0-9_$.]*/.exec(rest))) {
      toks.push({ t: "id", v: m[0] });
      i += m[0].length;
      continue;
    }
    const two = src.substr(i, 2);
    if (two === "<=" || two === ">=" || two === "<>") {
      toks.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/^&=<>(),:".includes(ch)) {
      toks.push({ t: "op", v: ch });
      i++;
      continue;
    }
    throw new ParseError("bad character");
  }
  return toks;
}

const CMP_OPS = new Set(["=", "<>", "<", ">", "<=", ">="]);

function parse(src) {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v) => toks[p] && toks[p].t === "op" && toks[p].v === v;
  const isOpIn = (set) => toks[p] && toks[p].t === "op" && set.has(toks[p].v);
  const expect = (v) => {
    if (!isOp(v)) throw new ParseError("expected " + v);
    p++;
  };

  function binLevel(ops, sub) {
    return function () {
      let l = sub();
      while (isOpIn(ops)) {
        const op = toks[p++].v;
        l = { k: "bin", op, l, r: sub() };
      }
      return l;
    };
  }

  function unary() {
    if (isOp("-") || isOp("+")) {
      const op = toks[p++].v;
      return { k: "un", op, e: unary() };
    }
    return power();
  }

  function power() {
    const base = primary();
    if (isOp("^")) {
      p++;
      return { k: "bin", op: "^", l: base, r: unary() };
    }
    return base;
  }

  const mult = binLevel(new Set(["*", "/"]), unary);
  const additive = binLevel(new Set(["+", "-"]), mult);
  const concat = binLevel(new Set(["&"]), additive);
  const comparison = binLevel(CMP_OPS, concat);

  function refToken(t) {
    if (!t) return null;
    if (t.t === "badref") return { k: "ref", valid: false };
    if (t.t === "id" && REF_RE.test(t.v)) return makeRefNode(t.v);
    return null;
  }

  function maybeRange(node) {
    if (!isOp(":")) return node;
    p++;
    const b = refToken(toks[p++]);
    if (!b) throw new ParseError("bad range");
    return { k: "range", a: node, b };
  }

  function primary() {
    const t = toks[p++];
    if (!t) throw new ParseError("unexpected end");
    if (t.t === "num") return { k: "num", v: t.v };
    if (t.t === "str") return { k: "str", v: t.v };
    if (t.t === "badref") return maybeRange({ k: "ref", valid: false });
    if (t.t === "op" && t.v === "(") {
      const e = comparison();
      expect(")");
      return e;
    }
    if (t.t === "id") {
      if (isOp("(")) {
        p++;
        const args = [];
        if (!isOp(")")) {
          args.push(comparison());
          while (isOp(",")) { p++; args.push(comparison()); }
        }
        expect(")");
        return { k: "fn", name: t.v.toUpperCase(), args };
      }
      const up = t.v.toUpperCase();
      if (up === "TRUE") return { k: "bool", v: true };
      if (up === "FALSE") return { k: "bool", v: false };
      if (REF_RE.test(t.v)) return maybeRange(makeRefNode(t.v));
      return { k: "name" };
    }
    throw new ParseError("unexpected token");
  }

  const ast = comparison();
  if (p < toks.length) throw new ParseError("trailing tokens");
  return ast;
}

function collectDeps(node, out) {
  if (!node) return;
  switch (node.k) {
    case "ref":
      if (node.valid) out.add(node.key);
      break;
    case "range":
      if (node.a.valid && node.b.valid) rangeKeys(node).forEach((k) => out.add(k));
      break;
    case "un":
      collectDeps(node.e, out);
      break;
    case "bin":
      collectDeps(node.l, out);
      collectDeps(node.r, out);
      break;
    case "fn":
      node.args.forEach((a) => collectDeps(a, out));
      break;
  }
}

// ---------- value helpers ----------

export function formatNumber(n) {
  if (!isFinite(n)) return String(n);
  if (Math.abs(n) >= 1e21) return String(n);
  let s = n.toFixed(10);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  if (s === "-0") s = "0";
  return s;
}

function toText(v) {
  if (v === EMPTY) return "";
  if (typeof v === "number") return formatNumber(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return v;
}

function toNum(v) {
  if (v === EMPTY) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return VALUE;
}

function compare(op, a, b) {
  if (typeof a === "boolean") a = a ? 1 : 0;
  if (typeof b === "boolean") b = b ? 1 : 0;
  if (a === EMPTY && b === EMPTY) { a = 0; b = 0; }
  if (a === EMPTY) a = typeof b === "number" ? 0 : "";
  if (b === EMPTY) b = typeof a === "number" ? 0 : "";
  if (typeof a !== typeof b) {
    if (op === "=") return false;
    if (op === "<>") return true;
    return VALUE;
  }
  if (typeof a === "string") { a = a.toLowerCase(); b = b.toLowerCase(); }
  switch (op) {
    case "=": return a === b;
    case "<>": return a !== b;
    case "<": return a < b;
    case ">": return a > b;
    case "<=": return a <= b;
    case ">=": return a >= b;
  }
  return ERROR;
}

function numResult(x) {
  if (Number.isNaN(x) || !isFinite(x)) return VALUE;
  return x === 0 ? 0 : x;
}

function roundHalfAway(x, digits) {
  const d = Math.trunc(digits);
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  let r;
  if (String(ax).includes("e")) {
    const m = Math.pow(10, d);
    r = Math.round(ax * m) / m;
  } else {
    r = Number(Math.round(Number(ax + "e" + d)) + "e" + -d);
  }
  return sign * r;
}

// ---------- sheet ----------

export function createSheet(initial) {
  const cells = new Map(); // key -> raw
  const astCache = new Map(); // raw -> ast | ERROR
  let memo = new Map();
  let cycleSet = new Set();
  let dirty = true;
  const undoStack = [];
  const redoStack = [];

  function getAst(raw) {
    if (astCache.has(raw)) return astCache.get(raw);
    let ast;
    try { ast = parse(raw.slice(1)); } catch (e) { ast = ERROR; }
    astCache.set(raw, ast);
    return ast;
  }

  function recompute() {
    memo = new Map();
    // build dependency graph
    const deps = new Map();
    for (const [key, raw] of cells) {
      if (raw[0] !== "=") continue;
      const ast = getAst(raw);
      const out = new Set();
      if (ast !== ERROR) collectDeps(ast, out);
      deps.set(key, out);
    }
    // Tarjan SCC
    const index = new Map(), low = new Map(), onStack = new Set(), stack = [];
    const inCycle = new Set();
    let idx = 0;
    function strong(v) {
      index.set(v, idx); low.set(v, idx); idx++;
      stack.push(v); onStack.add(v);
      for (const w of deps.get(v) || []) {
        if (!deps.has(w)) continue;
        if (!index.has(w)) {
          strong(w);
          low.set(v, Math.min(low.get(v), low.get(w)));
        } else if (onStack.has(w)) {
          low.set(v, Math.min(low.get(v), index.get(w)));
        }
      }
      if (low.get(v) === index.get(v)) {
        const comp = [];
        let w;
        do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== v);
        if (comp.length > 1 || (deps.get(v) && deps.get(v).has(v))) {
          comp.forEach((k) => inCycle.add(k));
        }
      }
    }
    for (const v of deps.keys()) if (!index.has(v)) strong(v);
    // everything that depends on a cycle cell
    const rev = new Map();
    for (const [k, ds] of deps) {
      for (const d of ds) {
        if (!rev.has(d)) rev.set(d, []);
        rev.get(d).push(k);
      }
    }
    const queue = [...inCycle];
    while (queue.length) {
      const k = queue.pop();
      for (const dep of rev.get(k) || []) {
        if (!inCycle.has(dep)) { inCycle.add(dep); queue.push(dep); }
      }
    }
    cycleSet = inCycle;
    dirty = false;
  }

  function cellValue(key) {
    if (memo.has(key)) return memo.get(key);
    const raw = cells.get(key);
    let v;
    if (raw === undefined || raw === "") v = EMPTY;
    else if (cycleSet.has(key)) v = CYCLE;
    else if (raw[0] === "=") {
      const ast = getAst(raw);
      memo.set(key, CYCLE); // guard against unexpected recursion
      v = ast === ERROR ? ERROR : evalNode(ast);
      if (v === EMPTY) v = 0;
      if (v === 0) v = 0;
    } else if (NUMBER_RE.test(raw.trim())) v = Number(raw.trim());
    else v = raw;
    memo.set(key, v);
    return v;
  }

  function evalNode(node) {
    switch (node.k) {
      case "num": return node.v;
      case "str": return node.v;
      case "bool": return node.v;
      case "name": return NAME;
      case "ref": return node.valid ? cellValue(node.key) : REF;
      case "range": return node.a.valid && node.b.valid ? VALUE : REF;
      case "un": {
        const v = evalNode(node.e);
        if (v instanceof Err) return v;
        const n = toNum(v);
        if (n instanceof Err) return n;
        return numResult(node.op === "-" ? -n : n);
      }
      case "bin": return evalBin(node.op, evalNode(node.l), evalNode(node.r));
      case "fn": return callFn(node.name, node.args);
    }
    return ERROR;
  }

  function evalBin(op, a, b) {
    if (a instanceof Err) return a;
    if (b instanceof Err) return b;
    if (op === "&") return toText(a) + toText(b);
    if (CMP_OPS.has(op)) return compare(op, a, b);
    const x = toNum(a);
    if (x instanceof Err) return x;
    const y = toNum(b);
    if (y instanceof Err) return y;
    switch (op) {
      case "+": return numResult(x + y);
      case "-": return numResult(x - y);
      case "*": return numResult(x * y);
      case "/": return y === 0 ? DIV0 : numResult(x / y);
      case "^": return x === 0 && y < 0 ? DIV0 : numResult(Math.pow(x, y));
    }
    return ERROR;
  }

  // Gather numbers for aggregate functions; returns array or Err.
  function collect(args, isCount) {
    const nums = [];
    for (const arg of args) {
      if (arg.k === "ref" || arg.k === "range") {
        let keys;
        if (arg.k === "ref") {
          if (!arg.valid) return REF;
          keys = [arg.key];
        } else {
          if (!arg.a.valid || !arg.b.valid) return REF;
          keys = rangeKeys(arg);
        }
        for (const k of keys) {
          const v = cellValue(k);
          if (v instanceof Err) return v;
          if (typeof v === "number") nums.push(v);
        }
        continue;
      }
      const v = evalNode(arg);
      if (v instanceof Err) return v;
      if (typeof v === "number") nums.push(v);
      else if (typeof v === "boolean") nums.push(v ? 1 : 0);
      else if (typeof v === "string") {
        if (isCount) continue;
        if (NUMBER_RE.test(v.trim())) nums.push(Number(v.trim()));
        else return VALUE;
      }
    }
    return nums;
  }

  function numArg(node) {
    const v = evalNode(node);
    if (v instanceof Err) return v;
    return toNum(v);
  }

  function callFn(name, args) {
    switch (name) {
      case "SUM":
      case "AVERAGE":
      case "MIN":
      case "MAX":
      case "COUNT": {
        const nums = collect(args, name === "COUNT");
        if (nums instanceof Err) return nums;
        if (name === "COUNT") return nums.length;
        if (name === "SUM") return numResult(nums.reduce((s, n) => s + n, 0));
        if (name === "AVERAGE") {
          if (!nums.length) return DIV0;
          return numResult(nums.reduce((s, n) => s + n, 0) / nums.length);
        }
        if (!nums.length) return 0;
        return name === "MIN" ? Math.min(...nums) : Math.max(...nums);
      }
      case "IF": {
        if (args.length < 2 || args.length > 3) return VALUE;
        const c = evalNode(args[0]);
        if (c instanceof Err) return c;
        let cond;
        if (c === EMPTY) cond = false;
        else if (typeof c === "boolean") cond = c;
        else if (typeof c === "number") cond = c !== 0;
        else return VALUE;
        if (cond) return evalNode(args[1]);
        return args.length === 3 ? evalNode(args[2]) : false;
      }
      case "ROUND": {
        if (args.length < 1 || args.length > 2) return VALUE;
        const x = numArg(args[0]);
        if (x instanceof Err) return x;
        const d = args.length === 2 ? numArg(args[1]) : 0;
        if (d instanceof Err) return d;
        return numResult(roundHalfAway(x, d));
      }
      case "ABS": {
        if (args.length !== 1) return VALUE;
        const x = numArg(args[0]);
        if (x instanceof Err) return x;
        return numResult(Math.abs(x));
      }
    }
    return NAME;
  }

  function value(ref) {
    const p = parseCellRef(ref);
    if (!p) return REF;
    if (dirty) recompute();
    return cellValue(p.key);
  }

  // ---------- mutation & history ----------

  function writeRaw(key, raw) {
    if (raw === "") cells.delete(key);
    else cells.set(key, raw);
    dirty = true;
  }

  function record(key, before, after) {
    undoStack.push({ key, before, after });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
  }

  function set(ref, raw) {
    const p = parseCellRef(ref);
    if (!p) return;
    raw = raw == null ? "" : String(raw);
    const before = cells.get(p.key) || "";
    writeRaw(p.key, raw);
    record(p.key, before, raw);
  }

  const SHIFT_RE = /("(?:[^"]|"")*")|(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|(\$?)([A-Za-z]+)(\$?)(\d+)(?![A-Za-z0-9_.$(])|[A-Za-z_][A-Za-z0-9_.]*/g;

  function shiftFormula(f, dc, dr) {
    return f.replace(SHIFT_RE, (m, str, num, d1, letters, d2, digits) => {
      if (letters === undefined) return m;
      const col = letters.length === 1 ? COLS.indexOf(letters.toUpperCase()) : -1;
      const row = Number(digits);
      if (col < 0 || row < 1 || row > NROWS) return m;
      const nc = d1 ? col : col + dc;
      const nr = d2 ? row : row + dr;
      if (nc < 0 || nc >= COLS.length || nr < 1 || nr > NROWS) return "#REF!";
      return d1 + COLS[nc] + d2 + nr;
    });
  }

  function copy(from, to) {
    const a = parseCellRef(from), b = parseCellRef(to);
    if (!a || !b) return;
    let raw = cells.get(a.key) || "";
    if (raw[0] === "=") raw = "=" + shiftFormula(raw.slice(1), b.c - a.c, b.r - a.r);
    const before = cells.get(b.key) || "";
    writeRaw(b.key, raw);
    record(b.key, before, raw);
  }

  function undo() {
    const step = undoStack.pop();
    if (!step) return false;
    writeRaw(step.key, step.before);
    redoStack.push(step);
    return true;
  }

  function redo() {
    const step = redoStack.pop();
    if (!step) return false;
    writeRaw(step.key, step.after);
    undoStack.push(step);
    return true;
  }

  // ---------- output ----------

  function get(ref) {
    const v = value(ref);
    if (v === EMPTY) return "";
    if (v instanceof Err) return v.code;
    return v;
  }

  function display(ref) {
    const v = value(ref);
    if (v instanceof Err) return v.code;
    return toText(v);
  }

  function raw(ref) {
    const p = parseCellRef(ref);
    if (!p) return "";
    return cells.get(p.key) || "";
  }

  function toCSV() {
    let maxR = 0, maxC = -1;
    for (const key of cells.keys()) {
      const p = parseCellRef(key);
      maxR = Math.max(maxR, p.r);
      maxC = Math.max(maxC, p.c);
    }
    if (!maxR) return "";
    const lines = [];
    for (let r = 1; r <= maxR; r++) {
      const fields = [];
      for (let c = 0; c <= maxC; c++) {
        const s = display(COLS[c] + r);
        fields.push(/[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
      }
      lines.push(fields.join(","));
    }
    return lines.join("\n");
  }

  function all() {
    return Object.fromEntries(cells);
  }

  if (initial && typeof initial === "object") {
    for (const [ref, r] of Object.entries(initial)) {
      const p = parseCellRef(ref);
      if (p && typeof r === "string") writeRaw(p.key, r);
    }
  }

  return { set, get, raw, display, copy, undo, redo, toCSV, all };
}
