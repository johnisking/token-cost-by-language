# Time-of-day study: analysis plan (written 2026-10-26 01:20 KST, before the first scheduled slot at 2026-10-27 04:00 KST)

Question: does Claude Haiku 5.5 in Claude Code do worse, run slower or fail more often at busy times of day or week?

Design (already fixed in the runner tod_run.ps1): 7 tasks x 3 runs per slot, order shuffled per slot with a seed from the slot time, 4 slots a day at 04:00, 09:00, 15:00 and 23:30 KST, from 2026-10-27 04:00 to 2026-11-02 23:30 KST (28 slots, 588 runs). Tasks: 5 real bugs (q629, mdit1201, z6495, z6496, ct435; hidden cases or maintainer tests), r1 (20 code-reading questions on qs, no code execution), f1 (write duration.js from a spec, hidden checks). One account (subscription login), one PC, one network. Missing slots are recorded and not re-run.

## Outcomes
1. Primary, quality: run score = share of the task's checks passed, using the scorer frozen before the first slot. A run that errors or times out scores 0 and is also counted under failures. Slot score = mean over the 21 runs with every task weighted equally.
2. Speed: duration_api_ms from the run's result line (time spent waiting on the API), and output tokens per API second. Total wall time is reported but not used for conclusions, because it includes local test time.
3. Failures: share of runs with a non-success result, an API error, a rate-limit message, or the 30-minute timeout.

## Grouping of slots
Times are converted to UTC and to US Eastern time with the DST change on 2026-11-01 applied.
- Peak: slots that fall in US Eastern weekday business hours, 09:00 to 17:00 local (the 23:30 and 04:00 KST slots on US weekdays).
- Off-peak: all other slots (09:00 and 15:00 KST slots, and every slot on a US Saturday or Sunday).

## Tests and decision rule
- Primary comparison: peak vs off-peak mean slot score. Slot-level permutation test (labels shuffled across the 28 slots, 10,000 permutations) and a slot-level bootstrap 95% CI for the difference.
- A difference is called real only if it is at least 10 percentage points and the CI excludes 0. A smaller or uncertain difference is reported as "not detected at this size", not as "no difference".
- Same test for API time and failure rate (threshold: 20% slower, or 5 points more failures).
- Secondary, descriptive only: the 4 clock slots, weekday vs weekend, and each day. With many comparisons, any p-values there are Holm-corrected and none of them is used as a headline.

## Contamination and sensitivity checks
- Every run records local Claude CLI sessions, desktop app processes, CPU, free memory and TCP time to api.anthropic.com before and after. Slots also record Claude Code version, Anthropic status page incidents, last boot time and pending reboot.
- Sensitivity analysis: repeat the primary test without runs that had another local Claude CLI session running, and without slots that overlap an incident on status.anthropic.com.
- Same-account use from other devices (phone, web, cloud sessions) cannot be recorded by the PC. The owner keeps a rough log of heavy use during slot windows; slots with heavy use are flagged and the sensitivity test is repeated without them.
- The model id in each run is checked. If it changes during the week, the week is split at that point and both parts are reported.

## Blinding
Runs are scored from copies renamed to random ids with no timestamps. Slot labels are joined back only after all scores are saved.

## Limits stated in advance
One model (Haiku), one account, one PC in Korea, one week. Results say nothing about Opus or Sonnet capacity, other regions or API-key traffic.

## Follow-up
If the primary test finds a peak/off-peak difference, an Opus 5.5 follow-up with the same tasks and slots will be pre-registered separately. If it does not, no Opus run is planned.
