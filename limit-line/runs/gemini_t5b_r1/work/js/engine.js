// js/engine.js

const COLS = 10; // A to J (0 to 9)
const ROWS = 30; // 1 to 30 (1 to 30)

const ERRORS = new Set([
  "#DIV/0!",
  "#REF!",
  "#NAME?",
  "#VALUE!",
  "#CYCLE!",
  "#ERROR!"
]);

function isError(val) {
  return typeof val === "string" && ERRORS.has(val);
}

// Parse a cell reference string like "A1", "$B$12", "j30"
// Returns { valid: true/false, col: 0..9, row: 1..30, absCol: bool, absRow: bool, normalized: "A1" }
// Or null if it doesn't even look like a cell reference token.
function parseCellRefToken(str) {
  const m = /^(\$?)([A-Za-z]+)(\$?)([0-9]+)$/.exec(str);
  if (!m) return null;
  const absCol = m[1] === "$";
  const colStr = m[2].toUpperCase();
  const absRow = m[3] === "$";
  const rowStr = m[4];

  // Check if col is single letter A-J and row is 1-30 without leading zeros (or valid int 1-30)
  if (colStr.length !== 1) {
    return { valid: false };
  }
  const colCode = colStr.charCodeAt(0) - 65;
  if (colCode < 0 || colCode >= COLS) {
    return { valid: false };
  }
  if (rowStr.startsWith("0")) {
    return { valid: false };
  }
  const rowNum = Number(rowStr);
  if (!Number.isInteger(rowNum) || rowNum < 1 || rowNum > ROWS) {
    return { valid: false };
  }
  return {
    valid: true,
    col: colCode,
    row: rowNum,
    absCol,
    absRow,
    normalized: `${colStr}${rowNum}`
  };
}

function normalizeGridRef(ref) {
  if (typeof ref !== "string") return null;
  const parsed = parseCellRefToken(ref.trim());
  if (!parsed || !parsed.valid || parsed.absCol || parsed.absRow) {
    // Allow normal grid ref like "A1" (or even if someone passed "a1")
    if (parsed && parsed.valid) return parsed.normalized;
    return null;
  }
  return parsed.normalized;
}

function formatNumberDisplay(num) {
  if (!Number.isFinite(num)) return "#VALUE!";
  // Round to at most 10 decimal places with trailing zeros removed
  // Avoid -0
  const rounded = Number(Math.round(Number(num + "e10")) + "e-10");
  // Fallback if num + "e10" overflows/underflows for very large/small numbers
  const val = Number.isNaN(rounded) ? Number(num.toFixed(10)) : rounded;
  if (Object.is(val, -0) || val === 0) return "0";
  // If fixed notation vs standard representation:
  // For standard numbers, Number(val.toFixed(10)).toString() removes trailing zeros nicely
  return Number(val.toFixed(10)).toString();
}

function formatDisplayValue(val) {
  if (val === "" || val === null || val === undefined) return "";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return formatNumberDisplay(val);
  return String(val);
}

// Tokenizer for formulas (input is the string after the leading '=')
function tokenizeFormula(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;

  while (i < n) {
    const ch = src[i];

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      i++;
      continue;
    }

    // String literal
    if (ch === '"') {
      let str = "";
      i++; // skip opening quote
      let closed = false;
      while (i < n) {
        if (src[i] === '"') {
          if (i + 1 < n && src[i + 1] === '"') {
            str += '"';
            i += 2;
          } else {
            i++;
            closed = true;
            break;
          }
        } else {
          str += src[i];
          i++;
        }
      }
      if (!closed) {
        return { error: "#ERROR!" };
      }
      tokens.push({ type: "STRING", value: str });
      continue;
    }

    // Two-character comparison operators: <>, <=, >=
    if (ch === "<" && i + 1 < n && (src[i + 1] === ">" || src[i + 1] === "=")) {
      tokens.push({ type: "OP", value: src.slice(i, i + 2) });
      i += 2;
      continue;
    }
    if (ch === ">" && i + 1 < n && src[i + 1] === "=") {
      tokens.push({ type: "OP", value: ">=" });
      i += 2;
      continue;
    }

    // Single-character operators and punctuation
    if ("=<>+-*/^&".includes(ch)) {
      tokens.push({ type: "OP", value: ch });
      i++;
      continue;
    }
    if (ch === "(" || ch === ")" || ch === "," || ch === ":") {
      tokens.push({ type: ch, value: ch });
      i++;
      continue;
    }

    // Numbers: digits or leading dot followed by digits
    if ((ch >= "0" && ch <= "9") || (ch === "." && i + 1 < n && src[i + 1] >= "0" && src[i + 1] <= "9")) {
      const start = i;
      while (i < n && src[i] >= "0" && src[i] <= "9") i++;
      if (i < n && src[i] === ".") {
        i++;
        while (i < n && src[i] >= "0" && src[i] <= "9") i++;
      }
      // Optional scientific notation if adjacent? Wait: be careful not to confuse with cell refs,
      // though a number followed immediately by letters without operator is invalid anyway.
      if (i < n && (src[i] === "e" || src[i] === "E")) {
        const expStart = i;
        i++;
        if (i < n && (src[i] === "+" || src[i] === "-")) i++;
        if (i < n && src[i] >= "0" && src[i] <= "9") {
          while (i < n && src[i] >= "0" && src[i] <= "9") i++;
        } else {
          i = expStart;
        }
      }
      const rawNum = src.slice(start, i);
      const numVal = Number(rawNum);
      if (Number.isNaN(numVal)) {
        return { error: "#ERROR!" };
      }
      tokens.push({ type: "NUMBER", value: numVal });
      continue;
    }

    // Cell reference, identifier (function / boolean / invalid ref), or #REF! literal
    if (ch === "#") {
      // Check if it's an explicit #REF! generated by copy() or user
      if (src.slice(i, i + 5).toUpperCase() === "#REF!") {
        tokens.push({ type: "REF_ERROR", value: "#REF!" });
        i += 5;
        continue;
      }
      return { error: "#ERROR!" };
    }

    if (ch === "$" || (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "_") {
      const start = i;
      // Scan potential cell reference or identifier:
      // A cell reference can have '$', letters, '$', digits.
      // An identifier can have letters, digits, '_'.
      if (ch === "$") i++;
      while (i < n && ((src[i] >= "A" && src[i] <= "Z") || (src[i] >= "a" && src[i] <= "z") || src[i] === "_")) {
        i++;
      }
      if (i < n && src[i] === "$") {
        i++;
      }
      while (i < n && ((src[i] >= "0" && src[i] <= "9") || (src[i] >= "A" && src[i] <= "Z") || (src[i] >= "a" && src[i] <= "z") || src[i] === "_")) {
        i++;
      }
      const rawIdent = src.slice(start, i);
      tokens.push({ type: "IDENT", value: rawIdent, pos: start, end: i });
      continue;
    }

    // Any other character is a syntax error
    return { error: "#ERROR!" };
  }

  return { tokens };
}

// Parser builds an AST from tokens
function parseFormula(src) {
  const tokRes = tokenizeFormula(src);
  if (tokRes.error) return { error: tokRes.error };
  const tokens = tokRes.tokens;
  if (tokens.length === 0) return { error: "#ERROR!" };

  let pos = 0;

  function peek() {
    return pos < tokens.length ? tokens[pos] : null;
  }

  function consume() {
    return tokens[pos++];
  }

  // Precedence levels:
  // 1. Comparison: =, <>, <, >, <=, >= (left-associative)
  // 2. Concatenation: & (left-associative)
  // 3. Additive: +, - (left-associative)
  // 4. Multiplicative: *, / (left-associative)
  // 5. Unary: +, - (prefix, right-associative, lower than ^ so -2^2 is -(2^2))
  // 6. Exponent: ^ (right-associative)
  // 7. Primary: literals, cell refs, function calls, parentheses

  function parseExpression() {
    return parseComparison();
  }

  function parseComparison() {
    let left = parseConcat();
    if (left.error) return left;
    while (true) {
      const t = peek();
      if (t && t.type === "OP" && ["=", "<>", "<", ">", "<=", ">="].includes(t.value)) {
        consume();
        const right = parseConcat();
        if (right.error) return right;
        left = { type: "Binary", op: t.value, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  function parseConcat() {
    let left = parseAdditive();
    if (left.error) return left;
    while (true) {
      const t = peek();
      if (t && t.type === "OP" && t.value === "&") {
        consume();
        const right = parseAdditive();
        if (right.error) return right;
        left = { type: "Binary", op: "&", left, right };
      } else {
        break;
      }
    }
    return left;
  }

  function parseAdditive() {
    let left = parseMultiplicative();
    if (left.error) return left;
    while (true) {
      const t = peek();
      if (t && t.type === "OP" && (t.value === "+" || t.value === "-")) {
        consume();
        const right = parseMultiplicative();
        if (right.error) return right;
        left = { type: "Binary", op: t.value, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  function parseMultiplicative() {
    let left = parseUnary();
    if (left.error) return left;
    while (true) {
      const t = peek();
      if (t && t.type === "OP" && (t.value === "*" || t.value === "/")) {
        consume();
        const right = parseUnary();
        if (right.error) return right;
        left = { type: "Binary", op: t.value, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  function parseUnary() {
    const t = peek();
    if (t && t.type === "OP" && (t.value === "+" || t.value === "-")) {
      consume();
      const operand = parseUnary();
      if (operand.error) return operand;
      return { type: "Unary", op: t.value, operand };
    }
    return parsePower();
  }

  function parsePower() {
    const left = parsePrimary();
    if (left.error) return left;
    const t = peek();
    if (t && t.type === "OP" && t.value === "^") {
      consume();
      // Right-associative, and note that rhs of ^ can also have unary operators e.g. 2^-3
      const right = parseUnary();
      if (right.error) return right;
      return { type: "Binary", op: "^", left, right };
    }
    return left;
  }

  function parseRefOrAtom(identToken) {
    const refInfo = parseCellRefToken(identToken.value);
    if (!refInfo) {
      return { error: "#NAME?" };
    }
    return { type: "CellRef", refInfo };
  }

  function parsePrimary() {
    const t = peek();
    if (!t) return { error: "#ERROR!" };

    if (t.type === "NUMBER") {
      consume();
      return { type: "Number", value: t.value };
    }

    if (t.type === "STRING") {
      consume();
      return { type: "String", value: t.value };
    }

    if (t.type === "REF_ERROR") {
      consume();
      if (peek() && peek().type === ":") {
        consume();
        const nextT = peek();
        if (nextT && (nextT.type === "IDENT" || nextT.type === "REF_ERROR")) {
          consume();
        }
      }
      return { type: "Error", value: "#REF!" };
    }

    if (t.type === "(") {
      consume();
      const expr = parseExpression();
      if (expr.error) return expr;
      const close = peek();
      if (!close || close.type !== ")") {
        return { error: "#ERROR!" };
      }
      consume();
      return expr;
    }

    if (t.type === "IDENT") {
      consume();
      const upper = t.value.toUpperCase();

      // Check if followed by '(' -> Function call
      if (peek() && peek().type === "(") {
        consume(); // consume '('
        const args = [];
        if (peek() && peek().type === ")") {
          consume();
          return { type: "Call", name: upper, args };
        }
        while (true) {
          const arg = parseFuncArg();
          if (arg.error) return arg;
          args.push(arg);
          const next = peek();
          if (next && next.type === ",") {
            consume();
          } else if (next && next.type === ")") {
            consume();
            break;
          } else {
            return { error: "#ERROR!" };
          }
        }
        return { type: "Call", name: upper, args };
      }

      // Check if followed by ':' -> Range outside function or inside function
      if (peek() && peek().type === ":") {
        // Range expression in primary (only valid inside function arguments, handled in parseFuncArg,
        // so if we hit ':' here it's a range used as a scalar expression -> #VALUE! or #ERROR!)
        return { error: "#ERROR!" };
      }

      // Check booleans TRUE / FALSE
      if (upper === "TRUE") {
        return { type: "Boolean", value: true };
      }
      if (upper === "FALSE") {
        return { type: "Boolean", value: false };
      }

      // Otherwise must be a cell reference
      const refInfo = parseCellRefToken(t.value);
      if (!refInfo) {
        // Unquoted text / unknown identifier
        return { type: "Error", value: "#NAME?" };
      }
      return { type: "CellRef", refInfo };
    }

    return { error: "#ERROR!" };
  }

  function parseFuncArg() {
    // Check if the argument is a range like A1:B3
    if (
      pos + 2 < tokens.length &&
      (tokens[pos].type === "IDENT" || tokens[pos].type === "REF_ERROR") &&
      tokens[pos + 1].type === ":" &&
      (tokens[pos + 2].type === "IDENT" || tokens[pos + 2].type === "REF_ERROR")
    ) {
      // Make sure the range is followed by ',' or ')' so something like A1:B2+1 is not parsed as valid
      const afterRange = pos + 3 < tokens.length ? tokens[pos + 3] : null;
      if (!afterRange || (afterRange.type !== "," && afterRange.type !== ")")) {
        return { error: "#ERROR!" };
      }
      const startTok = consume();
      consume(); // ':'
      const endTok = consume();

      if (startTok.type === "REF_ERROR" || endTok.type === "REF_ERROR") {
        return { type: "Range", valid: false };
      }
      const startRef = parseCellRefToken(startTok.value);
      const endRef = parseCellRefToken(endTok.value);
      if (!startRef || !endRef) {
        return { error: "#ERROR!" };
      }
      if (!startRef.valid || !endRef.valid) {
        return { type: "Range", valid: false };
      }
      return { type: "Range", valid: true, start: startRef, end: endRef };
    }

    return parseExpression();
  }

  const ast = parseExpression();
  if (ast.error) return ast;
  if (pos < tokens.length) {
    return { error: "#ERROR!" };
  }
  return { ast };
}

// Collect all static cell references that a formula AST could possibly depend on
function collectDependencies(node, deps = new Set()) {
  if (!node) return deps;
  switch (node.type) {
    case "CellRef":
      if (node.refInfo && node.refInfo.valid) {
        deps.add(node.refInfo.normalized);
      }
      break;
    case "Range":
      if (node.valid) {
        const c1 = Math.min(node.start.col, node.end.col);
        const c2 = Math.max(node.start.col, node.end.col);
        const r1 = Math.min(node.start.row, node.end.row);
        const r2 = Math.max(node.start.row, node.end.row);
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            deps.add(`${String.fromCharCode(65 + c)}${r}`);
          }
        }
      }
      break;
    case "Unary":
      collectDependencies(node.operand, deps);
      break;
    case "Binary":
      collectDependencies(node.left, deps);
      collectDependencies(node.right, deps);
      break;
    case "Call":
      for (const arg of node.args) {
        collectDependencies(arg, deps);
      }
      break;
  }
  return deps;
}

// Shift cell references in a raw formula string by (dCol, dRow)
function shiftFormulaReferences(rawFormula, dCol, dRow) {
  if (!rawFormula.startsWith("=")) return rawFormula;
  const body = rawFormula.slice(1);
  let result = "=";
  let i = 0;
  const n = body.length;

  while (i < n) {
    const ch = body[i];

    // Skip string literals unchanged
    if (ch === '"') {
      result += ch;
      i++;
      while (i < n) {
        result += body[i];
        if (body[i] === '"') {
          if (i + 1 < n && body[i + 1] === '"') {
            result += body[i + 1];
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          i++;
        }
      }
      continue;
    }

    // Check identifier / reference token
    if (ch === "$" || (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "_") {
      const start = i;
      if (ch === "$") i++;
      while (i < n && ((body[i] >= "A" && body[i] <= "Z") || (body[i] >= "a" && body[i] <= "z") || body[i] === "_")) {
        i++;
      }
      if (i < n && body[i] === "$") {
        i++;
      }
      while (i < n && ((body[i] >= "0" && body[i] <= "9") || (body[i] >= "A" && body[i] <= "Z") || (body[i] >= "a" && body[i] <= "z") || body[i] === "_")) {
        i++;
      }
      const tokenStr = body.slice(start, i);

      // Don't treat function names (immediately followed by '(') as references
      let k = i;
      while (k < n && (body[k] === " " || body[k] === "\t")) k++;
      const isFuncCall = k < n && body[k] === "(";

      if (!isFuncCall) {
        const refInfo = parseCellRefToken(tokenStr);
        if (refInfo && refInfo.valid) {
          const newCol = refInfo.absCol ? refInfo.col : refInfo.col + dCol;
          const newRow = refInfo.absRow ? refInfo.row : refInfo.row + dRow;
          if (newCol < 0 || newCol >= COLS || newRow < 1 || newRow > ROWS) {
            result += "#REF!";
          } else {
            const colPrefix = refInfo.absCol ? "$" : "";
            const rowPrefix = refInfo.absRow ? "$" : "";
            const colLetter = String.fromCharCode(65 + newCol);
            result += `${colPrefix}${colLetter}${rowPrefix}${newRow}`;
          }
          continue;
        }
      }

      result += tokenStr;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

function roundHalfAwayFromZero(x, digits) {
  const d = Math.trunc(digits);
  if (!Number.isFinite(x) || !Number.isFinite(d)) return "#VALUE!";
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  if (d >= 0) {
    const factor = Math.pow(10, d);
    if (!Number.isFinite(factor)) return x;
    // Use exponential shift where possible to avoid floating point representation glitches like 1.005 * 100
    const shifted = Number(absX + "e" + d);
    const rounded = Number.isNaN(shifted)
      ? Math.floor(absX * factor + 0.5) / factor
      : Number(Math.floor(shifted + 0.5) + "e-" + d);
    const res = sign * rounded;
    return Object.is(res, -0) ? 0 : res;
  } else {
    const negD = -d;
    const factor = Math.pow(10, negD);
    if (!Number.isFinite(factor)) return 0;
    const shifted = Number(absX + "e-" + negD);
    const rounded = Number.isNaN(shifted)
      ? Math.floor(absX / factor + 0.5) * factor
      : Number(Math.floor(shifted + 0.5) + "e" + negD);
    const res = sign * rounded;
    return Object.is(res, -0) ? 0 : res;
  }
}

export function createSheet() {
  // Map of normalized cell ref ("A1") -> raw string
  const rawCells = new Map();
  // Map of normalized cell ref ("A1") -> parsed AST (if formula)
  const parsedCache = new Map();
  // Map of normalized cell ref ("A1") -> evaluated value
  const valueCache = new Map();

  // Undo / Redo stacks (up to 100 steps)
  // Each entry is { ref, prevRaw, nextRaw }
  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 100;

  function parseScalarRaw(raw) {
    if (raw === "") return "";
    // Check if plain number (like "12", "-3.5", " 4 ")
    const trimmed = raw.trim();
    if (trimmed !== "" && /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isFinite(num)) {
        return Object.is(num, -0) ? 0 : num;
      }
    }
    return raw;
  }

  function recomputeAll() {
    valueCache.clear();
    parsedCache.clear();

    for (const [ref, raw] of rawCells.entries()) {
      if (raw.startsWith("=")) {
        parsedCache.set(ref, parseFormula(raw.slice(1)));
      }
    }

    function evalCell(ref, visiting = new Set()) {
      if (valueCache.has(ref)) {
        return valueCache.get(ref);
      }
      const raw = rawCells.get(ref) || "";
      if (raw === "") {
        valueCache.set(ref, "");
        return "";
      }
      if (!raw.startsWith("=")) {
        const val = parseScalarRaw(raw);
        valueCache.set(ref, val);
        return val;
      }

      if (visiting.has(ref)) {
        return "#CYCLE!";
      }

      visiting.add(ref);
      const parsed = parsedCache.get(ref);
      let result;
      if (!parsed || parsed.error) {
        result = parsed ? parsed.error : "#ERROR!";
      } else {
        result = evalNode(parsed.ast, (depRef) => evalCell(depRef, visiting));
      }
      visiting.delete(ref);

      // Only memoize permanently when at top-level or when no active ancestors are in a cycle
      if (visiting.size === 0 && result !== "#CYCLE!") {
        valueCache.set(ref, result);
      }
      return result;
    }

    for (const ref of rawCells.keys()) {
      const val = evalCell(ref, new Set());
      valueCache.set(ref, val);
    }
  }

  function toArithmeticNumber(val) {
    if (isError(val)) return val;
    if (val === "") return 0;
    if (typeof val === "boolean") return val ? 1 : 0;
    if (typeof val === "number") return val;
    return "#VALUE!";
  }

  function toConditionBoolean(val) {
    if (isError(val)) return val;
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    if (val === "") return false;
    return "#VALUE!";
  }

  function evalNode(node, getCellVal) {
    switch (node.type) {
      case "Number":
      case "String":
      case "Boolean":
      case "Error":
        return node.value;

      case "CellRef": {
        if (!node.refInfo || !node.refInfo.valid) {
          return "#REF!";
        }
        return getCellVal(node.refInfo.normalized);
      }

      case "Range":
        // A range outside a range-accepting function argument is #VALUE!
        return node.valid ? "#VALUE!" : "#REF!";

      case "Unary": {
        const v = evalNode(node.operand, getCellVal);
        const num = toArithmeticNumber(v);
        if (isError(num)) return num;
        const res = node.op === "-" ? -num : +num;
        return Object.is(res, -0) ? 0 : res;
      }

      case "Binary": {
        const op = node.op;
        const leftVal = evalNode(node.left, getCellVal);
        if (isError(leftVal)) return leftVal;
        const rightVal = evalNode(node.right, getCellVal);
        if (isError(rightVal)) return rightVal;

        if (op === "&") {
          return formatDisplayValue(leftVal) + formatDisplayValue(rightVal);
        }

        if (op === "+" || op === "-" || op === "*" || op === "/" || op === "^") {
          const lNum = toArithmeticNumber(leftVal);
          if (isError(lNum)) return lNum;
          const rNum = toArithmeticNumber(rightVal);
          if (isError(rNum)) return rNum;

          let res;
          if (op === "+") res = lNum + rNum;
          else if (op === "-") res = lNum - rNum;
          else if (op === "*") res = lNum * rNum;
          else if (op === "/") {
            if (rNum === 0) return "#DIV/0!";
            res = lNum / rNum;
          } else if (op === "^") {
            if (lNum === 0 && rNum < 0) return "#DIV/0!";
            res = Math.pow(lNum, rNum);
          }

          if (!Number.isFinite(res)) return "#VALUE!";
          return Object.is(res, -0) ? 0 : res;
        }

        // Comparison operators: =, <>, <, >, <=, >=
        if (op === "=" || op === "<>") {
          const eq = compareEqual(leftVal, rightVal);
          return op === "=" ? eq : !eq;
        }

        if (op === "<" || op === ">" || op === "<=" || op === ">=") {
          return compareRelational(op, leftVal, rightVal);
        }

        return "#ERROR!";
      }

      case "Call":
        return evalFunctionCall(node.name, node.args, getCellVal);

      default:
        return "#ERROR!";
    }
  }

  function compareEqual(a, b) {
    // Wait: how are empty cells handled in comparisons?
    // In spreadsheets or according to spec:
    // Spec:
    // "- An empty cell counts as 0 in arithmetic and as "" in &. TRUE and FALSE count as 1 and 0 in arithmetic. Text used in arithmetic is #VALUE!. & joins displayed values (="A"&1.50 is "A1.5")."
    // "- = and <> compare numbers by value and text without regard to case; a number never equals a text. <, >, <= and >= work on two numbers or two texts (text compared without regard to case); a number against a text is #VALUE!."
    // What if an empty cell is compared with 0 or ""?
    // If empty cell is "", it's a string "", or if compared with "": "" = "" is true!
    // Wait: what if two booleans are compared? true === true.
    if (typeof a === "number" && typeof b === "number") {
      return a === b;
    }
    if (typeof a === "string" && typeof b === "string") {
      return a.toLowerCase() === b.toLowerCase();
    }
    if (typeof a === "boolean" && typeof b === "boolean") {
      return a === b;
    }
    return false;
  }

  function compareRelational(op, a, b) {
    let cmp;
    if (typeof a === "number" && typeof b === "number") {
      cmp = a < b ? -1 : a > b ? 1 : 0;
    } else if (typeof a === "string" && typeof b === "string") {
      const la = a.toLowerCase();
      const lb = b.toLowerCase();
      cmp = la < lb ? -1 : la > lb ? 1 : 0;
    } else if (typeof a === "boolean" && typeof b === "boolean") {
      const na = a ? 1 : 0;
      const nb = b ? 1 : 0;
      cmp = na < nb ? -1 : na > nb ? 1 : 0;
    } else {
      return "#VALUE!";
    }

    if (op === "<") return cmp < 0;
    if (op === ">") return cmp > 0;
    if (op === "<=") return cmp <= 0;
    if (op === ">=") return cmp >= 0;
    return "#ERROR!";
  }

  function evalFunctionCall(name, args, getCellVal) {
    if (name === "SUM" || name === "AVERAGE" || name === "MIN" || name === "MAX" || name === "COUNT") {
      if (args.length === 0) return "#ERROR!";
      const numbers = [];

      for (const arg of args) {
        if (arg.type === "Range") {
          if (!arg.valid) return "#REF!";
          const c1 = Math.min(arg.start.col, arg.end.col);
          const c2 = Math.max(arg.start.col, arg.end.col);
          const r1 = Math.min(arg.start.row, arg.end.row);
          const r2 = Math.max(arg.start.row, arg.end.row);
          for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
              const cellRef = `${String.fromCharCode(65 + c)}${r}`;
              const val = getCellVal(cellRef);
              if (isError(val)) return val;
              if (typeof val === "number") {
                numbers.push(val);
              }
            }
          }
        } else if (arg.type === "CellRef") {
          if (!arg.refInfo || !arg.refInfo.valid) return "#REF!";
          const val = getCellVal(arg.refInfo.normalized);
          if (isError(val)) return val;
          if (typeof val === "number") {
            numbers.push(val);
          } else if (val === "" || typeof val === "string" || typeof val === "boolean") {
            // Wait: what if a single cell reference is passed to SUM/COUNT/etc., e.g. SUM(A1, B1)?
            // Spec: "SUM, AVERAGE, MIN, MAX and COUNT take any mix of numbers, references and ranges (A1:B3, in any corner order). In ranges they use only number cells and skip text and empty cells; COUNT counts number cells."
            // What if a cell reference has a number vs empty vs text?
            // If A1 is a number, it's included. What if A1 is empty or text in SUM(A1, 5) or COUNT(A1, B1)?
            // In Excel/spreadsheets, references passed to SUM/COUNT/AVERAGE/MIN/MAX behave just like 1x1 ranges (skipping text and empty cells, counting only number cells), whereas a direct literal/expression like SUM("abc") is #VALUE! (or for COUNT, COUNT(1, "a")).
            // Wait — what if someone does SUM(A1) where A1 is text? Does a reference in SUM skip text or error?
            // Let's re-read carefully:
            // "SUM, AVERAGE, MIN, MAX and COUNT take any mix of numbers, references and ranges (A1:B3, in any corner order). In ranges they use only number cells and skip text and empty cells; COUNT counts number cells."
          }
        } else {
          const val = evalNode(arg, getCellVal);
          if (isError(val)) return val;
          if (typeof val === "number") {
            numbers.push(val);
          } else if (name === "COUNT") {
            // COUNT counts numbers
          } else {
            const num = toArithmeticNumber(val);
            if (isError(num)) return num;
            numbers.push(num);
          }
        }
      }

      if (name === "COUNT") {
        return numbers.length;
      }
      if (name === "SUM") {
        let sum = 0;
        for (const x of numbers) sum += x;
        return Object.is(sum, -0) ? 0 : sum;
      }
      if (name === "AVERAGE") {
        if (numbers.length === 0) return "#DIV/0!";
        let sum = 0;
        for (const x of numbers) sum += x;
        const avg = sum / numbers.length;
        return Object.is(avg, -0) ? 0 : avg;
      }
      if (name === "MIN") {
        if (numbers.length === 0) return 0;
        let min = numbers[0];
        for (let i = 1; i < numbers.length; i++) {
          if (numbers[i] < min) min = numbers[i];
        }
        return Object.is(min, -0) ? 0 : min;
      }
      if (name === "MAX") {
        if (numbers.length === 0) return 0;
        let max = numbers[0];
        for (let i = 1; i < numbers.length; i++) {
          if (numbers[i] > max) max = numbers[i];
        }
        return Object.is(max, -0) ? 0 : max;
      }
    }

    if (name === "IF") {
      if (args.length < 2 || args.length > 3) return "#ERROR!";
      const condVal = evalNode(args[0], getCellVal);
      if (isError(condVal)) return condVal;
      const condBool = toConditionBoolean(condVal);
      if (isError(condBool)) return condBool;

      if (condBool) {
        return evalNode(args[1], getCellVal);
      } else {
        if (args.length === 3) {
          return evalNode(args[2], getCellVal);
        }
        return false;
      }
    }

    if (name === "ROUND") {
      if (args.length !== 2) return "#ERROR!";
      const xVal = evalNode(args[0], getCellVal);
      if (isError(xVal)) return xVal;
      const dVal = evalNode(args[1], getCellVal);
      if (isError(dVal)) return dVal;

      const xNum = toArithmeticNumber(xVal);
      if (isError(xNum)) return xNum;
      const dNum = toArithmeticNumber(dVal);
      if (isError(dNum)) return dNum;

      return roundHalfAwayFromZero(xNum, dNum);
    }

    if (name === "ABS") {
      if (args.length !== 1) return "#ERROR!";
      const xVal = evalNode(args[0], getCellVal);
      if (isError(xVal)) return xVal;
      const xNum = toArithmeticNumber(xVal);
      if (isError(xNum)) return xNum;
      return Math.abs(xNum);
    }

    return "#NAME?";
  }

  function applyRawChange(normRef, newRaw, recordHistory) {
    const strRaw = newRaw === undefined || newRaw === null ? "" : String(newRaw);
    const prevRaw = rawCells.get(normRef) || "";
    if (recordHistory) {
      undoStack.push({ ref: normRef, prevRaw, nextRaw: strRaw });
      if (undoStack.length > MAX_HISTORY) {
        undoStack.shift();
      }
      redoStack.length = 0;
    }
    if (strRaw === "") {
      rawCells.delete(normRef);
    } else {
      rawCells.set(normRef, strRaw);
    }
    recomputeAll();
  }

  return {
    set(ref, raw) {
      const normRef = normalizeGridRef(ref);
      if (!normRef) return;
      applyRawChange(normRef, raw, true);
    },

    get(ref) {
      const normRef = normalizeGridRef(ref);
      if (!normRef) return "#REF!";
      if (!rawCells.has(normRef)) return "";
      if (!valueCache.has(normRef)) {
        recomputeAll();
      }
      return valueCache.get(normRef) ?? "";
    },

    raw(ref) {
      const normRef = normalizeGridRef(ref);
      if (!normRef) return "";
      return rawCells.get(normRef) || "";
    },

    display(ref) {
      const normRef = normalizeGridRef(ref);
      if (!normRef) return "#REF!";
      const val = this.get(normRef);
      return formatDisplayValue(val);
    },

    copy(from, to) {
      const normFrom = normalizeGridRef(from);
      const normTo = normalizeGridRef(to);
      if (!normFrom || !normTo) return;

      const fromInfo = parseCellRefToken(normFrom);
      const toInfo = parseCellRefToken(normTo);
      const sourceRaw = rawCells.get(normFrom) || "";

      let targetRaw = sourceRaw;
      if (sourceRaw.startsWith("=")) {
        const dCol = toInfo.col - fromInfo.col;
        const dRow = toInfo.row - fromInfo.row;
        targetRaw = shiftFormulaReferences(sourceRaw, dCol, dRow);
      }

      applyRawChange(normTo, targetRaw, true);
    },

    undo() {
      if (undoStack.length === 0) return;
      const step = undoStack.pop();
      redoStack.push(step);
      if (step.prevRaw === "") {
        rawCells.delete(step.ref);
      } else {
        rawCells.set(step.ref, step.prevRaw);
      }
      recomputeAll();
    },

    redo() {
      if (redoStack.length === 0) return;
      const step = redoStack.pop();
      undoStack.push(step);
      if (step.nextRaw === "") {
        rawCells.delete(step.ref);
      } else {
        rawCells.set(step.ref, step.nextRaw);
      }
      recomputeAll();
    },

    toCSV() {
      let maxCol = -1;
      let maxRow = -1;

      for (const [ref, raw] of rawCells.entries()) {
        if (raw !== "") {
          const info = parseCellRefToken(ref);
          if (info && info.valid) {
            if (info.col > maxCol) maxCol = info.col;
            if (info.row > maxRow) maxRow = info.row;
          }
        }
      }

      if (maxCol === -1 || maxRow === -1) {
        return "";
      }

      const lines = [];
      for (let r = 1; r <= maxRow; r++) {
        const fields = [];
        for (let c = 0; c <= maxCol; c++) {
          const ref = `${String.fromCharCode(65 + c)}${r}`;
          const disp = this.display(ref);
          if (disp.includes(",") || disp.includes('"') || disp.includes("\n") || disp.includes("\r")) {
            fields.push(`"${disp.replace(/"/g, '""')}"`);
          } else {
            fields.push(disp);
          }
        }
        lines.push(fields.join(","));
      }
      return lines.join("\n");
    },

    _loadBulk(data) {
      rawCells.clear();
      for (const [ref, raw] of Object.entries(data)) {
        const normRef = normalizeGridRef(ref);
        if (normRef && typeof raw === "string" && raw !== "") {
          rawCells.set(normRef, raw);
        }
      }
      undoStack.length = 0;
      redoStack.length = 0;
      recomputeAll();
    }
  };
}
