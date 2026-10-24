# Claude Haiku vs Sonnet vs Opus on 25 real bugs

225 Claude Code runs on 25 real bugs fixed between August and October 2026 in 13 open-source projects, 3 runs per bug for Claude Haiku 5.5, Sonnet 5.5 and Opus 5.5. Every run is scored by the maintainers' own tests for the fix.

Page with tables and method: https://tokensave.app/data/claude-haiku-vs-opus-real-bugs · DOI [10.5281/zenodo.23619927](https://doi.org/10.5281/zenodo.23619927) · [Hugging Face](https://huggingface.co/datasets/JOHNISKING/claude-haiku-vs-opus-real-bugs) · [Kaggle](https://www.kaggle.com/datasets/johnisking/claude-haiku-vs-sonnet-vs-opus-on-25-real-bugs)

![One square per run: 25 real bugs by Claude Haiku, Sonnet and Opus 5.5](claude-haiku-vs-opus-real-bugs-chart.png)

## Findings

- **Overall, Haiku matched Opus.** Clean fixes (every maintainer test case passes and nothing else breaks): Haiku 52/75, Sonnet 49/75, Opus 54/75. Resampling whole bugs, the 95% interval for Haiku minus Opus is -11 to +5 percentage points: no evidence that Opus fixes more bugs, though a gap of about 10 points cannot be ruled out.
- **Cost per run at API prices:** Haiku $0.019, Sonnet $0.14, Opus $0.38 (about 95% less for Haiku than Opus).
- **Easy round** (15 bugs, cause close to the symptom): clean fixes Haiku 40/45, Sonnet 35/45, Opus 38/45; no run broke the project's test suite.
- **Hard round** (10 bugs, symptom-only reports): clean fixes Haiku 12/30, Sonnet 14/30, Opus 16/30; runs that broke other maintainer tests 10, 7 and 5. Interval for Haiku minus Opus: -33 to 0 points.
- **Bug by bug**, Haiku and Opus had the same number of clean fixes on 22 of 25 bugs. Opus had more on nested links in marked (2 vs 0) and a markdown-it code-span bug (3 vs 1); Haiku had more on a js-yaml block scalar bug (3 vs 1).
- **No model found what the report left out:** on cachetools, js-yaml (BOM) and Python-Markdown every run fixed the reported example and missed the same unreported case.

## Files

- `claude-haiku-vs-opus-real-bugs.csv`: one row per run (round, bug, project, parent commit, model, rep, cases passed/total, full fix, tests broken, clean fix, API cost, seconds, turns, permission denials, failed and broken test names).
- `claude-haiku-vs-opus-real-bugs.json`: the same runs plus bug list, scoring rules and statistics (Fisher's exact test, paired permutation test, bug-level bootstrap intervals).
- `claude-haiku-vs-opus-real-bugs-chart.png`: one square per run.

## Folder layout

- `runs/easy/<model>_<bug>_r<n>/`, `runs/hard/<model>_<bug>_r<n>/`: every run as recorded on the PC: `prompt.txt`, `run.jsonl` (Claude Code stream-json log), `changes_raw.diff` (the run's changes), `seconds.txt`, `status.txt`, `err.txt`, and new files under `untracked/`. The Windows user name is replaced by `USER`.
- `prompts/easy/`, `prompts/hard/`: the exact prompt for each bug.
- `scripts/pc/`: PowerShell scripts that built the bug folders at the parent commit and ran Claude Code.
- `scripts/easy/`: easy-round scoring (`score_run.py`, hidden cases in `cases.mjs` and `cases.py`, `agg.py`), `scores.jsonl`.
- `scripts/hard/`: hard-round scoring (`hb_score.py`, `baseline.json` with the target and guard tests per bug, `score_all.sh`, `agg_all.py`), `scores_hard.jsonl`.
- `scripts/build_dataset.py`, `scripts/charts_bugs.py`: build the CSV/JSON and the chart.
- `posts/`: the write-ups in English, Korean and Japanese.

## Method

- Start: source at the commit before each upstream fix, dependencies installed, fresh git history. Prompt: the bug report cut down to symptom, reproduction and expected result.
- Agent: Claude Code 2.1.295 on Windows 11, headless (`-p`), effort medium, acceptEdits; read-only shell commands, the project's test runner and build allowed; no installs, no network, no web tools.
- Scoring: only the run's changes to library source were kept; the maintainers' tests for the fix were run against them. Easy round: hidden cases written from those tests plus the full project suite. Hard round: the fix's test files, before vs after the fix (target = fail before, pass after; broken = pass before and after, fail with the run). Timing tests are not counted as broken.

## Limitations

3 runs per bug and model, 25 bugs; permissions differ from the previous dataset (tests allowed here); the tomlkit underscore report was written from the upstream issue; zod's CLAUDE.md symlink did not extract on Windows; the projects are public, so similar code may be in training data (all fixes are from Aug to Oct 2026).

Previous dataset: https://tokensave.app/data/ai-coding-limit-line

License: CC BY 4.0. Cite: TokenSave (2026). Claude Haiku vs Sonnet vs Opus on 25 real bugs: 225 runs scored by the maintainers' tests [Data set]. https://tokensave.app/data/claude-haiku-vs-opus-real-bugs
