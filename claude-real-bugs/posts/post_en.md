# Claude Haiku vs Opus on 25 real bugs: 52 vs 54 clean fixes, 95% cheaper

Last week I measured where Claude Haiku 5.5 falls behind Opus. The answer was one hard bug in the marked parser, where Sonnet and Opus caught an edge case the bug report left out and Haiku mostly did not. One bug is thin evidence, so this time I gave the three models 25 real bugs.

**Short version:** Haiku fixed as many bugs cleanly as Opus (52 and 54 of 75 runs) at about 95% less cost. Opus was ahead on the harder bugs, mostly because it broke other tests less often. And where a bug report left a case out, all three models missed it the same way.

## Setup

- **25 bugs** fixed upstream between August and October 2026 in 13 open-source projects: js-yaml, jsdiff, qs, PapaParse, markdown-it, marked, zod, humanize, tomlkit, more-itertools, cachetools, Python-Markdown, pyparsing.
- Each run started from **the commit before the fix**, with dependencies installed and no git history, so the fix could not be looked up.
- The prompt was **the bug report cut down to the symptom**: what happens, how to reproduce it, what should happen. Cause analysis and proposed fixes were removed.
- **Claude Code 2.1.295**, headless, effort medium. The agent could read files, edit them and run the project's tests. No installs, no network.
- **3 runs per bug and model**, 225 runs in total.
- **Scoring:** I kept only the run's changes to the library source (tests it wrote were thrown away) and ran **the maintainers' own tests for the fix** against it, plus the project's tests to catch anything it broke.

The bugs came in two rounds. The **easy round** (15 bugs) had cause and symptom close together. The **hard round** (10 bugs) used bugs where the report only shows a symptom, often far from the cause.

## Results

![One square per run: 25 bugs by Haiku, Sonnet and Opus](https://tokensave.app/claude-haiku-vs-opus-real-bugs-chart.png)

"Clean fix" means every maintainer test case for the fix passes and no other test breaks.

| | Haiku 5.5 | Sonnet 5.5 | Opus 5.5 |
|---|---|---|---|
| Clean fixes, easy round | 40/45 | 35/45 | 38/45 |
| Clean fixes, hard round | 12/30 | 14/30 | 16/30 |
| **Clean fixes, all** | **52/75** | **49/75** | **54/75** |
| Runs that broke other tests (hard) | 10 | 7 | 5 |
| Cost per run (API prices) | $0.019 | $0.14 | $0.38 |
| All 75 runs together | $1.41 | $10.83 | $28.53 |

On 22 of the 25 bugs, Haiku and Opus had exactly the same number of clean fixes. The three where they differed:

- **marked, a link inside link text:** Opus fixed it cleanly 2 of 3 times, Haiku 0 of 3. Every Haiku run broke the spec test for that exact example.
- **markdown-it, an unclosed link label hiding a code span:** Opus 3 of 3, Haiku 1 of 3. Two Haiku runs fixed the bug but broke two neighbouring tests.
- **js-yaml, a block scalar with a whitespace-only body:** Haiku 3 of 3, Opus 1 of 3, Sonnet 0 of 3.

One more bug is worth a mention: a **zod** bug that needed numeric record keys handled in several places of the JSON Schema output. No run fixed all of it, but Opus passed 14 of the 24 test cases over its three runs, Haiku 9 and Sonnet 5.

## The part no model got

On three hard bugs, every run of every model fixed the example in the report and missed the same case the report did not mention:

- **cachetools:** the report showed one way of calling a cached method through its class. The maintainers also tested every other variant of the decorator. No run handled those.
- **js-yaml:** the report was about a BOM at the start of a file. The maintainers also tested a BOM before each document in a multi-document stream. No run handled it.
- **Python-Markdown:** every run fixed the reported HTML comment and broke 3 to 5 of the maintainers' tests for comments after other inline HTML.

Last time, Sonnet and Opus were better at finding a case like this. Across 25 bugs that did not hold. Paying for a bigger model did not buy the missing case; reading the maintainers' tests would have.

## Is the difference real?

Probably not detectable at this size, and I want to be careful here.

- **Haiku vs Opus, all bugs:** Fisher's exact test on clean fixes p = 0.86. Resampling whole bugs, the 95% interval for Haiku minus Opus is −11 to +5 percentage points. So there is no evidence that Opus fixes more bugs, but a 10-point gap cannot be ruled out.
- **Hard round only:** the interval is −33 to 0 points. Opus may really be better on bugs like these; 10 bugs are not enough to say.
- **Sonnet** passed a smaller share of test cases than Opus overall (paired permutation test p = 0.006), the only clearly significant difference.

To show that two models are equal within ±10 points would take several hundred runs per model, on different bugs. I will keep adding bugs with the same method.

## What I take from it

- **For bugs where the cause is near the symptom, Haiku is enough.** Same clean-fix count as Opus, about 95% cheaper.
- **For bugs that touch several places, Opus is the safer pick.** It broke other tests in half as many hard-round runs as Haiku (5 against 10).
- **No model finds what the report leaves out.** In the hard round, 47% to 60% of each model's runs were not clean fixes. That is where review time should go, whichever model you use.

## Limitations

- 3 runs per bug and model, 25 bugs. Treat the model differences as hints.
- Unlike last week's runs, every run here could run the project's tests.
- I wrote the tomlkit underscore report myself from the upstream issue, which had no reproduction. Every run of every model passed the same 20 of its 29 cases.
- On Windows, zod's CLAUDE.md (a symlink) did not extract, so zod runs had no project instructions.
- Timing tests were not counted as broken, because they fail at random under load.
- The projects are public, so the models may have seen similar code in training. All fixes are from August to October 2026.

Data (225 runs: cases passed, tests broken, time and cost per run; CSV and JSON, CC BY 4.0): https://tokensave.app/data/claude-haiku-vs-opus-real-bugs

Disclosure: I run TokenSave, which publishes these measurements. No support or credits from Anthropic.
