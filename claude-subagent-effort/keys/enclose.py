import ast, sys
f, lines = sys.argv[1], [int(x) for x in sys.argv[2].split(',')]
t = ast.parse(open(f, encoding='utf-8').read())
spans = []
def walk(n, cls=None):
    for ch in ast.iter_child_nodes(n):
        if isinstance(ch, ast.ClassDef):
            spans.append((ch.lineno, ch.end_lineno, ch.name)); walk(ch, ch.name)
        elif isinstance(ch, (ast.FunctionDef, ast.AsyncFunctionDef)):
            spans.append((ch.lineno, ch.end_lineno, (cls + '.' if cls else '') + ch.name)); walk(ch, cls)
        else:
            walk(ch, cls)
walk(t)
for l in lines:
    ins = sorted([s for s in spans if s[0] <= l <= s[1]], key=lambda s: s[1] - s[0])
    print(f"{l}\t{'|'.join(s[2] for s in ins) if ins else '<module>'}")
