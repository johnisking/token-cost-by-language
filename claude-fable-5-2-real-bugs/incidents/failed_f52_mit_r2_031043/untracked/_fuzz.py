import random
from decimal import Decimal
from fractions import Fraction
from more_itertools import numeric_range

random.seed(1)
bad = 0


def check(r):
    global bad
    items = list(r)
    ok = len(r) == len(items)
    ok = ok and [r[i] for i in range(len(r))] == items
    ok = ok and list(reversed(r)) == items[::-1]
    ok = ok and all(v in r for v in items)
    ok = ok and all(r.index(v) == items.index(v) for v in items)
    ok = ok and all(r.count(v) == items.count(v) for v in items)
    ok = ok and r._stop not in r and bool(r) == bool(items)
    ok = ok and list(r[:]) == items
    if not ok:
        bad += 1
        if bad < 10:
            print('BAD', r)


for _ in range(40000):
    a = random.uniform(-100, 100)
    b = a + random.uniform(-60, 60)
    s = random.choice([1, -1]) * random.uniform(0.01, 8)
    if random.random() < 0.5:
        a, b, s = round(a, 3), round(b, 3), round(s, 1)
        if s == 0:
            continue
    check(numeric_range(a, b, s))
    check(numeric_range(Fraction(a), Fraction(b), Fraction(s)))
    check(numeric_range(Decimal(repr(a)), Decimal(repr(b)), Decimal(repr(s))))
    check(numeric_range(int(a), int(b), int(s) or 1))
for args in [(0.0, 1.0, 0.1), (1e16, 1e16 + 40, 0.3), (1e16, 1e16 - 40, -0.3),
             (0.0, 1e-300, 1e-320), (5.0, 5.0, 1.0), (0.0, 0.3, 0.1)]:
    check(numeric_range(*args))
r = numeric_range(1e16, 1e16 + 40, 0.3)
print(len(r), r.count(1e16), r.index(1e16 + 2))
r = numeric_range(0.0, 1e9, 0.1)
print(len(r), r[len(r) - 1], 0.30000000000000004 in r, 0.3 in r)
print('bad', bad)
