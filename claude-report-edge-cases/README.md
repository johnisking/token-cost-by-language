# Can a prompt or more effort make Claude find what a bug report leaves out? (pre-registration)

Status: pre-registered on 2026-10-25, before any run. Results will be added to this folder.

This is the follow-up to [claude-real-bugs](../claude-real-bugs). In that study Haiku, Sonnet and Opus all missed the cases a bug report did not mention. This study asks whether a prompt or a higher effort setting changes that.

Files:
- PREREG.md: question, conditions, bug selection rules, outcomes, decision rule, and dated amendments made before any run.
- prompts_ds26.json: the symptom-only bug reports for the 13 new bugs. The 8 bugs reused from claude-real-bugs keep their prompts from that study.
- labels.json: for every maintainer test case, whether the report shows it (R) or not (U). Frozen before runs.
- checks/: maintainer test cases split one case per test, so R and U cases are scored separately.

The sha256 of each frozen file is listed at the end of PREREG.md.

License: CC BY 4.0. Bug reports are quoted from public GitHub issues of their projects, cut down to the symptom.
