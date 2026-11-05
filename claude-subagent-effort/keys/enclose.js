// usage: node enclose.js <file> <line>[,<line>...]  -> prints "line\tname" (innermost named function/method; class name prefix)
const fs = require('fs');
const { parse } = require('@babel/parser');
const [file, linesArg] = process.argv.slice(2);
const lines = linesArg.split(',').map(Number);
const src = fs.readFileSync(file, 'utf8');
const ast = parse(src, { sourceType: 'unambiguous', errorRecovery: true,
  plugins: file.endsWith('.ts') ? ['typescript', 'decorators-legacy'] : ['jsx', 'classProperties', 'classPrivateProperties', 'classPrivateMethods'] });
const spans = [];
function nameOf(node, parent, cls) {
  let n = null;
  if (node.id && node.id.name) n = node.id.name;
  else if ((node.type === 'ClassMethod' || node.type === 'ClassPrivateMethod' || node.type === 'ObjectMethod') && node.key)
    n = node.key.name || node.key.value || (node.key.id && '#' + node.key.id.name);
  else if (parent) {
    if (parent.type === 'VariableDeclarator' && parent.id.name) n = parent.id.name;
    else if ((parent.type === 'ObjectProperty' || parent.type === 'ClassProperty' || parent.type === 'ClassPrivateProperty') && parent.key) n = parent.key.name || parent.key.value || (parent.key.id && '#' + parent.key.id.name);
    else if (parent.type === 'AssignmentExpression') {
      const l = parent.left; n = l.type === 'MemberExpression' ? (src.slice(l.start, l.end)) : (l.name || null);
    }
  }
  if (n && cls && (node.type === 'ClassMethod' || node.type === 'ClassPrivateMethod' || (parent && /ClassP/.test(parent.type)))) n = cls + '.' + n;
  return n;
}
function walk(node, parent, cls) {
  if (!node || typeof node.type !== 'string') return;
  let c = cls;
  if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') c = (node.id && node.id.name) || (parent && parent.id && parent.id.name) || cls;
  if (/Function|Method/.test(node.type) && node.loc) {
    const n = nameOf(node, parent, c);
    if (n) spans.push({ s: node.loc.start.line, e: node.loc.end.line, n });
  }
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach(x => x && typeof x.type === 'string' && walk(x, node, c));
    else if (v && typeof v.type === 'string') walk(v, node, c);
  }
}
walk(ast.program, null, null);
for (const l of lines) {
  const inside = spans.filter(s => s.s <= l && l <= s.e).sort((a, b) => (a.e - a.s) - (b.e - b.s));
  console.log(l + '\t' + (inside.length ? inside.map(x => x.n).join('|') : '<module>'));
}
