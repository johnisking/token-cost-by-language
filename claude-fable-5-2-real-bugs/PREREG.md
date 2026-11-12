# Pre-registration: Claude Fable 5.2 vs Fable 5.1 vs Opus 5.5 on 25 real bugs

Registered 2026-11-13 (KST), before the first scored run. Author: TokenSave (Jonhisking).

## Question

Claude Fable 5.2 (released November 2026) lists at $8 / $40 per million input / output tokens, 20% below Fable 5.1 ($10 / $50) and 100% above Opus 5.5 ($4 / $20).

1. Is Fable 5.2 also cheaper per fixed bug, or does it use more tokens and give back part of the 20%?
2. Does Fable 5.2 fix more real bugs than Opus 5.5, at twice the price per token?

## Tasks

The 25 real bugs of dataset 25 ([claude-real-bugs](../claude-real-bugs), DOI 10.5281/zenodo.23619927): 15 "easy" bugs (cause close to the symptom) and 10 "hard" bugs (symptom-only reports), fixed upstream between August and October 2026 in 13 open-source projects. Same starting folders (source at the parent commit, dependencies installed, fresh git history), same prompts, same hidden scoring as dataset 25.

## Arms

| Arm | Model ID | Runs per bug | Runs |
|---|---|---:|---:|
| Fable 5.2 | `claude-fable-5-2` | 3 | 75 |
| Fable 5.1 | `claude-fable-5-1` | 2 | 50 |
| Opus 5.5 | `claude-opus-5-5` | 2 | 50 |
| Total | | | 175 |

Opus 5.5 is re-run (not reused from dataset 25) so that every arm uses the same Claude Code version.

## Harness

- Claude Code 2.1.322 (a separate local install), Windows 11, headless `claude -p`, `--effort medium`, `--permission-mode acceptEdits`, stream-json log, no MCP servers.
- Same allowed and denied tools as dataset 25: read-only shell commands, the project's test runner and build allowed; no installs, no network, no web tools.
- Run order: `jobs.csv`, shuffled with seed 52 (sha256 `1fc4c103651af6d60e4dd12292badbf74616e4dfbe920b52a30c02733bc88642`), two workers in parallel.
- Subscription: Claude Max 5x. Runs that end with a usage-limit or login error produce no answer, are not scored and are re-run; every such failure is reported.

## Pilot (not part of the data)

On 2026-11-12, bug `d699` was run once with Fable 5.2 ($0.33, 40 s) and once with Fable 5.1 ($0.44, 35 s), to check that both model IDs are accepted. A first attempt failed on an expired login. Pilot runs are kept separately and are not scored.

## Outcomes

- **Primary 1, cost:** mean API cost per run (list prices, `total_cost_usd` from the log), Fable 5.2 vs Fable 5.1, as a percentage change, with a 95% bootstrap interval resampling bugs. Reported against the list-price change of -20%.
- **Primary 2, fixes:** clean fixes (every maintainer test case for the fix passes and nothing else breaks, dataset 25 rules), Fable 5.2 vs Opus 5.5, as the difference in percentage points with a 95% bug-level bootstrap interval. A difference of 15 points or more counts as meaningful.
- **Secondary:** cost per clean fix for each arm; output tokens, thinking tokens, cache reads, turns and seconds per run; Fable 5.2 vs Fable 5.1 clean fixes; easy and hard rounds separately.

## Scoring

Unchanged from dataset 25: only the run's changes to library source are kept and the maintainers' tests for the fix are run against them (easy round: `scripts/easy/score_run.py` with the hidden cases; hard round: `scripts/hard/hb_score.py` with `baseline.json`). Scoring is automatic and done without looking at which arm a run belongs to until the table is built.

## Analysis plan

Per-arm means, then the two primary contrasts with 10,000 bug-level bootstrap resamples (seed 52). Arms with unequal runs per bug are averaged per bug first, then across bugs. Any change to this plan after the first scored run is added below as a dated amendment.

## Amendments

**Amendment 1 (2026-11-13 02:15 KST, after 30 runs, before any scoring).** The first 21 runs used the subscription's whole 5-hour window in 34 minutes (mean API cost per run: Fable 5.2 $0.78, Fable 5.1 $1.78, Opus 5.5 $0.34), so the full design would have needed about seven more 5-hour windows. The design is cut to Fable 5.2 × 2, Fable 5.1 × 1 and Opus 5.5 × 2 runs per bug (125 runs). The remaining jobs of `jobs.csv` keep their order; jobs for Fable 5.2 rep 3 and Fable 5.1 rep 2 that had not started are dropped (original list kept as `jobs_original.csv`). Ten runs in the dropped cells had already finished (Fable 5.2 rep 3: p1163, mit, mk4051, z6495; Fable 5.1 rep 2: z6496, y802, mk4059, q629, pm1643, d701). They are scored and published but left out of the primary analysis, so every bug has the same number of runs per arm. No outcome or threshold changes. Two runs cut off by the 5-hour limit (00:36) are not scored and were re-run.
