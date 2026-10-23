# Limit line, tier 5 design (draft, 2026-10-23)

Tiers 2 to 4 found no failure point: Haiku, Sonnet, Opus, Codex and Antigravity Gemini scored full marks
(one Codex tier-4 run lost 3 of 23 to a checker/format disagreement). Tier 5 has to be harder in the ways
real work is harder, not just longer.

## What made tiers 2-4 easy

- Every task started from an empty folder: the model writes code it already knows how to write.
- The spec listed every id and function name, so nothing had to be discovered.
- Hidden tests checked normal cases; few edge cases, no interaction between features.

## Tier 5: two tasks, one run each per tool and repetition

### 5A. Fix and extend an existing app (brownfield)

Start: the tier-4 reference budget app (about 900 lines in 8 files), with 6 planted bugs and no notes on where they are.
The prompt gives only a user-style bug report and 3 feature requests:

Bug report (symptoms only):
1. Monthly repeats starting on the 31st skip February (planted in recurring.js).
2. Importing a CSV with a quoted line break splits the row (csv.js).
3. Undo after deleting a filtered row restores the wrong transaction (app.js, index vs id).
4. Budget "spent" counts income as spending (budget.js sign).
5. The balance shows 1234.5 instead of 1234.50 after an import (formatting path only used by import).
6. Reloading on #/budgets shows the transactions view (router init order).

Features:
- F1 Edit a transaction in place (button .edit, same form, undoable).
- F2 Categories rename: renaming in #/budgets renames all matching transactions and budgets (undoable as one step).
- F3 Report compares the month with the previous month (#report shows a delta column with a sign).

Hidden tests (about 30): 6 bug checks, 3 x 3 feature checks, and the original 23 tier-4 tests as regression tests.
What this measures: reading code it did not write, finding causes from symptoms, not breaking working parts.

### 5B. Spreadsheet engine from a spec (deep logic)

Empty folder. index.html + js/engine.js (pure module) + js/app.js. Grid A1:J30.
engine.js exports createSheet() with set(ref, raw), get(ref) -> value, display(ref), and undo/redo.
Formulas: numbers, + - * / ^, unary minus, parentheses, precedence, cell refs, ranges, SUM AVERAGE MIN MAX COUNT IF ROUND,
string literals and & concatenation, comparison operators.
Errors: #DIV/0!, #REF! (out of grid), #NAME? (unknown function), #CYCLE! for every cell in a cycle, errors propagate.
Recalculation: dependents update in the right order when a cell changes; a cycle that is broken recovers.
Copy/paste moves relative refs and keeps $A$1 refs. CSV export of values, save to localStorage.

Hidden tests (about 40, mostly module calls): precedence (2+3*4^2), right-assoc ^, unary minus, nested IF,
ranges over empty cells, cycle of 3 cells then broken, error propagation, absolute vs relative paste, undo of paste.
What this measures: getting many small rules right at once; partial credit shows where each model drifts.

## Runs and cost

- 5 tools x 2 tasks x 5 runs = 50 runs, same harness settings as tiers 2-4 (medium effort).
- Expected 2 to 6 minutes per run, about 3 hours on the PC. Antigravity needs a read-only command allow-rule
  (listing the folder), otherwise headless mode ends the turn on its first `Get-ChildItem` (seen in tier 4 run 4).
  To keep tools comparable, allow the same read-only listing in all tools, nothing else.

## Checkers and validation (before any run)

- Reference solutions for 5A and 5B written first; each must score full marks.
- Broken variants (at least 4 per task) must lose exactly their target checks.
- Score every run twice; flag any check that differs between the two scorings.
- Partial scores are the result: report points per tool and which checks failed most.
