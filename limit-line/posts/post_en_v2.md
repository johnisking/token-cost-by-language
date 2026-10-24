Most "which model should I use for coding" advice is a guess. I wanted a line: the point where the cheap model (Claude Haiku 5.5) starts falling behind and you should pay for Sonnet or Opus.

So I ran 163 headless coding runs on one Windows laptop, across five agents, on tasks that get harder level by level, and scored every result with hidden tests.

**Agents:** Claude Code with Haiku 5.5, Sonnet 5.5 and Opus 5.5; Codex with gpt-6-luna; Google's Antigravity CLI with Gemini 4 Argon. All at medium effort, each run in a fresh folder.

## The levels

| Level | Task | Hidden checks |
|---|---|---|
| L2 | Five-level brick game with pause, level skip and saved progress | 9 |
| L3 | Multi-file expense tracker with CSV and summary modules | 12 |
| L4 | Budget app: 5 modules, 3 hash-routed views, budgets, reports, 50-step undo | 23 |
| L5A | An existing 1,032-line app with 6 planted bugs (symptoms only) + 3 new features | 38 |
| L5B | Spreadsheet engine: precedence, functions, cycle detection, $absolute copy, undo | 38 |
| L6 | Three real bugs fixed in the marked Markdown parser in Sep to Oct 2026 | upstream test + full spec suite |

For L6, each run started from the commit before the real fix, got a user-style bug report, and was scored by the test the maintainers added with the fix plus marked's whole spec suite (about 1,900 checks). I copied back only the run's `src/` folder, so editing tests could not help.

## Levels 2 to 5: no line at all

| Agent | L2 | L3 | L4 | L5A | L5B |
|---|---|---|---|---|---|
| Haiku 5.5 | 5/5 | 5/5 | 5/5 | 4/4 | 2/2 |
| Sonnet 5.5 | 5/5 | 5/5 | 5/5 | 4/4 | 2/2 |
| Opus 5.5 | 5/5 | 5/5 | 5/5 | 4/4 | 2/2 |
| Codex | 5/5 | 4/5 | 4/5 | 3/4 | 1/1 |
| Gemini 4 Argon | 5/5 | 5/5 | 5/5 | 2/2 | 1/1 |

(runs with full marks / runs)

**With a clear spec, Haiku never failed.** It built the spreadsheet engine with cycle detection, and in L5A it fixed all six bugs from symptoms alone, added the features and kept all 23 old tests passing. The easy and medium real bugs in L6 were also solved by almost every run, Haiku and Sonnet in 14 to 20 seconds.

## The hard bug: where the models split

The hard L6 bug: a code span ending in a backslash, like `` `C:\Users\` ``, stopped `**bold**` later on the line from working. The maintainers' test for the fix has 7 cases, and the unfixed code already passes 3.

No run fixed it completely. But the runs did not fail in the same way:

![Test cases passed per run on the hard bug](https://tokensave.app/ai-coding-limit-line-chart.png?v=2)

| Model | Tests | Cases passed (of 7), per run | Broke other tests |
|---|---|---|---|
| Haiku 5.5 | no | 5, 5, 5, 5, 5 | 1 run (15 tests) |
| Haiku 5.5 | allowed | 5, 6, 5, 5, 5 | 0 |
| Sonnet 5.5 | no | 6, 6, 5, 6, 6 | 0 |
| Sonnet 5.5 | allowed | 6, 6, 6, 5, 6 | 0 |
| Opus 5.5 | no | 6, 6, 6, 5, 0* | 1 run |
| Opus 5.5 | allowed | 6, 6, 5, 5, 6 | 0 |
| Codex | no | 3, 3, 4, 4, 4 | 3 runs (2 tests each) |
| Gemini 4 Argon | no | 3, 3, 3 | 0 |

\* That Opus run left an invalid regular expression in the source, so marked threw on load and every test failed.

Every run fixed the examples in the bug report. What was left were code spans that themselves contain a backtick, such as ``_``\`_`` ``, which the report did not mention. **Sonnet passed 6 of the 7 cases in 8 of 10 runs, Opus in 6 of 10, Haiku in 1 of 10.** That one unreported edge case is the line I was looking for.

## "They couldn't run the tests" was the obvious objection

In the first round no agent could run marked's tests: no packages were installed, and Claude Code ran without shell access. A real developer would run the suite while fixing the bug, so I ran each Claude model 5 more times with the dependencies preinstalled and the prompt allowing `node`, `npm test` / `npm run` and read-only git (installs and the network stayed off).

Every one of those 15 runs ran the spec suite, and most wrote their own reproduction scripts. **The number of cases they got right did not change.** What changed was damage: without tests, 2 of 15 Claude runs broke something else (the Haiku run that broke 15 spec tests and the Opus run that stopped marked from loading). With tests, 0 of 15 did.

So in this bug, running tests protected the rest of the code, but it did not make any model think of the case the report left out.

I also tried Codex with tests allowed, but its Windows sandbox blocked esbuild from building marked in all 5 runs, so those runs are excluded. Gemini had used up its quota.

## Cost

Claude Code reports an API-price cost for every run. Average per run:

| | Haiku 5.5 | Sonnet 5.5 | Opus 5.5 |
|---|---|---|---|
| All levels | $0.026 | $0.19 | $0.45 |
| Hard bug, no tests | $0.012 | $0.12 | $0.39 |
| Hard bug, tests allowed | $0.031 | $0.22 | $0.48 |

Haiku cost about 94% less per run than Opus over all levels.

## What this means in practice

- **Clear spec, Haiku is enough.** For building something from a clear spec, or fixing bugs whose symptoms are described, Haiku got the same full marks as Opus at about 94% less cost per run.
- **A real bug with an incomplete report, use Sonnet or Opus.** They caught the extra edge case far more often than Haiku (8 and 6 of 10 runs vs 1 of 10). On this bug Sonnet did best and was also cheaper than Opus ($0.12 to $0.22 vs $0.39 to $0.48 per run), but with 10 runs each the Sonnet vs Opus gap could be chance.
- **Whatever the model, let it run the tests.** It did not find the missing case, but no run broke other code once tests were allowed.
- **Still review edge cases yourself.** No model fixed the bug completely, and the cases they all missed were the ones only the maintainers thought of.

## A note on Antigravity

Antigravity's headless mode ends the whole turn the first time a command is denied. With read-only allow-rules, several Gemini runs read the code for minutes and then stopped on a `node -e` check before editing (on Windows a quoted command needs an exact rule). With full permissions, Gemini solved the easy and medium bugs too, in 2 to 11 minutes; one hard run hit its 30-minute limit without an edit.

## Limitations

- The split between models rests on one hard bug from one project, 10 runs per Claude model.
- Few runs per cell at levels 2 to 5 (1 to 5), and those prompts list every id and function name the tests use, which is easier than real work.
- The tests-allowed comparison covers the three Claude models only.
- The tools differ in more than the model (sandbox, permissions, how they stop on a denied command).

Data (163 runs, scores, test cases, time, tokens and cost per run, CC BY 4.0): https://tokensave.app/data/ai-coding-limit-line

Disclosure: I run TokenSave, which publishes these measurements. No funding or credits from Anthropic, OpenAI or Google.
