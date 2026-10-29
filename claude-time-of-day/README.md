# Does Claude get worse at busy times? (pre-registration)

Cancelled on 2026-10-29 before any slot ran. No data was collected.

Status: pre-registered on 2026-10-26, before the first measurement slot. The study week was moved on 2026-10-26 (before any slot ran) to 2026-11-02 04:00 through 2026-11-08 KST. Results will be added here after 2026-11-08.

Claude Haiku 5.5 in Claude Code, 7 fixed tasks (5 real bugs, a code-reading quiz, a spec-to-code task), 3 runs each, 4 times a day for 7 days (588 runs). Quality, API time and failures are compared between US business hours and other times.

Files:
- ANALYSIS_PLAN.md: outcomes, slot grouping, tests, decision rule, contamination checks, limits.
- runner/tod_run.ps1: the runner (random task order per slot, per-run logs of local load and network), runner/register_tasks.ps1: the Windows scheduled tasks, runner/r1_prompt.txt and runner/f1_prompt.txt: the two non-bug tasks. The 5 bug prompts are in ../claude-real-bugs.

License: CC BY 4.0.
