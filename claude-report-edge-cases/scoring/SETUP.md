# Rebuilding the scoring worktrees

worktrees.txt: tag, repo, upstream fix commit, source dir, ds26 check file.
For each bug: `fix` = the fix commit; `parent` = the fix commit with the source dir checked out from fix^ (files added by the fix removed), so both trees hold the maintainers' new tests. The ds26 check file from ../checks is copied into both.
The parent source trees were checked against the trees the runs started from (git tree hash of the source dir): all match except undici, whose run copy was stored with CRLF line endings; its pool-base.js blob matches fix^.

Environment (Linux): Python venv with pytest, pytest-timeout, pytest-cov, hypothesis, pyyaml, freezegun. Node 22. zod: pnpm install with a temporary pnpm-workspace.yaml (packages/*) and --no-frozen-lockfile; others: npm install --ignore-scripts.
anyio (any1273, any1364) is scored separately.

Then: `python3 score26.py baseline 5`, `python3 score_all.py <runs> <out.jsonl>`, `python3 analyze26.py <out.jsonl> <model>`.
