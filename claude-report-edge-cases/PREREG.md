# Dataset 26 pre-registration (written 2026-10-25 18:40 KST, before any run)

Question: can a prompt or higher effort make Claude find the cases a bug report leaves out?

Models: Haiku 5.5, Opus 5.5. Claude Code version pinned on run day, effort medium unless the condition says otherwise.

Conditions (fixed text, written before bug selection):
- C0 baseline: symptom-only report, same as dataset 25.
- C1 effort high: same prompt, effort high.
- C2 edge prompt: report + "Before changing code, list the inputs and variants this report does not mention but the fix must also handle. Write tests for them first, then fix."
- C3 edge prompt + read tests: C2 + "Read the existing tests for the code you change before you start."

Runs: 3 per bug x condition x model.

Bugs (24):
- K: 8 bugs from dataset 25 with unreported cases (ct435, jy791, pm1643, z6495, z6496, mk4051, t336, q629). Same parent commits and prompts.
- N: 10 new bugs fixed upstream after 2026-10-12, at least one maintainer test case not shown in the report.
- H: 6 hard bugs, separate group. Criteria: fix touches 3+ source files, or 50+ changed source lines, or involves concurrency, shared state, caching or retry.

Selection rules:
- Maintainer fix commit includes test changes.
- Each maintainer test case is labelled REPORTED (the report shows that input) or UNREPORTED before any run. Labels frozen in labels.json.
- Flake check: run the maintainer tests 5 times at parent and at fix. Any test that is not stable is dropped from scoring.
- Project must build offline on Windows.

Primary outcome: share of UNREPORTED cases passed, per condition and model, bug-level bootstrap 95% CI.
Secondary: clean-fix rate, broken tests, cost per run.
Decision rule: claim a prompt/effort effect only if the difference vs C0 is 20 points or more and the CI excludes 0. K, N and H are reported separately and pooled.
Floor check: if every condition passes under 10% of UNREPORTED cases in a group, report it as a floor, not as "no effect".

## Amendment 1 (2026-10-25 18:58 KST, before final selection and before any run)
- Date window changed from "after 2026-10-12" to "fixed upstream 2026-08-01 or later and not used in dataset 25", the same window as dataset 25. Reason: several strong concurrency bugs were fixed between 09-27 and 10-11. Model training cutoffs are earlier than both dates, so this does not change contamination risk.
- Scoring unit: each maintainer assertion group is split into its own check so that REPORTED and UNREPORTED cases are scored separately even when they share one test function.

## Amendment 2 (2026-10-25 19:20 KST, before any run)
- Excluded at selection: bugs whose report states an expected result that the maintainers' tests contradict (tomlkit#546: the report expects key order kept for an array of tables, the maintainer test keeps dict-valued keys last there; anyio#1385: the report expects later sends to keep working, the maintainer test expects the stream to be marked broken). Also excluded: fastify#7117 (every tested variant is already in the report), undici#5936 (test skips itself when the race is not observable), keyv#2203 (needs a live Redis), Python-Markdown#1657 (full rewrite that also changes other expected outputs).
- Final new set: 8 N + 6 H = 14 bugs. With the 8 K bugs, 22 bugs x 4 conditions x 2 models x 3 runs = 528 runs.
- anyio#1273: the fix commit also fixed #1288 and #1237. Only tests about concurrent aclose_forcefully (all socket types and backends) are scored; tests for the other two issues are excluded from both scoring and breakage.
- dateutil#1369 had no reproduction, only a workaround. The symptom report and repro were written by me from the issue; the workaround code is removed.

## Amendment 3 (2026-10-25 19:27 KST, before any run)
- p-queue#255 dropped: its only maintainer test repeats the reported case. H group is 5 bugs. Total 21 bugs, 504 runs.
- Unreported cases include guards. Some unreported maintainer cases already pass at the parent commit (for example the shorter closing backtick run in Python-Markdown#1668). They are kept as unreported guards: a fix that breaks them fails that case. Primary outcome pools unreported targets and unreported guards. Unreported targets alone are reported as a secondary outcome.
- zod's vitest config runs every test twice, in normal mode and in compiled mode. Both count as separate cases.
- labels.json and the check files in checks/ are frozen now. sha256 below.
  86e2a29673a895d9cd379e5225eb5f595080f03ad0020147796cace232e4dcab  labels.json
  3ecbfe0d0a517823192a71010587fa3e88e7cad2054cba0a3acc8b81919805ca  prompts_ds26.json
  4c33e700bb4e65ce2d4bdf8a6d687c2f384816f6721af00d08714f10d460b2c0  checks/ds26_fastify.test.js
  3a781ca054476ed3a3a027861fb9fec286c151e1b2b22bf25130bad39c1bd4a5  checks/ds26_zod.test.ts
  5636887f0a6101bad662b94ff6722a7205285e37e59d3fb1799308d8af614c1d  checks/test_ds26_cachetools.py

## Amendment 4 (2026-10-25 19:47 KST, before any run)
- ct440 prompt: the example test command pointed at tests/test_cachedmethod.py. It now points at tests/test_ttl.py, the file for TTLCache. No other prompt changed.
- Runs capture new untracked source files too (git add -A before git diff), unlike dataset 25.
  eb548e5f8c8da0a28637a00f9f5386da2ad5d01682f10dca90f1127e16c53ef3  prompts_ds26.json
