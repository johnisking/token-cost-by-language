# Vibe coding with Claude Haiku, Sonnet and Opus 5.5

Measured 2026-10-20 by TokenSave. Page, method, findings and limitations: https://tokensave.app/data/vibe-coding-by-claude-model

Files: CSV and JSON (same as the site downloads), the scripts used to build and check them, and the raw logs (zip; the PC user name is replaced by USER).

License: CC BY 4.0. Cite as: TokenSave (2026). See the page for the citation.

## Deeper brick-breaker check (added 2026-10-21)

The first brick-breaker check only confirmed that each game loads, draws a canvas and takes input without script errors. It did not verify the prompt's requirements (2 levels, a score, 3 lives), so the same 15 archived games were checked again with `check_brick_deep.py`. Results are in `brick_deep.json`.

- Score went up in 15 of 15 games.
- Every game reached its second level (15 of 15).
- The game's own lives value started at 3 and dropped by one per lost ball until game over (15 of 15).

The games were not regenerated or edited. A scripted player follows the ball (found by observing canvas drawing calls) on a fast-forwarded clock. In 9 games the lives value is inside a closure, so it is read from a temporary test copy with one added line that exposes it; the archived files are unchanged. Requires Python with Playwright and Chromium: `python3 check_brick_deep.py <folder with the brick_* run folders> > brick_deep.json`.

Revision (2026-10-21, later the same day): the first version pressed the serve key before reading the lives value. In `brick_opus-5-5_r5` that key also restarted the game from its Game Over screen, so the zero was not recorded (3, 2, 1, 3). The revised `check_brick_deep.py` reads the value before any key press and passes a game only if it records exactly 3, 2, 1, 0. Re-run on all 15 games: 15 of 15 pass (`brick_deep.json`). `trace_opus_r5_gameover.py` traces that game's (lives, state) until game over: (3, play) -> (2, serve) -> (2, play) -> (1, serve) -> (1, play) -> (0, gameover); `brick_opus-5-5_r5_gameover.png` is the screen at that moment.
