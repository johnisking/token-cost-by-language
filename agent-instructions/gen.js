// Generates realistic CLAUDE.md / AGENTS.md files of 1, 5, 10, 25 and 50 KB (smaller files are prefixes of larger ones).
const fs = require('fs'), path = require('path');
const head = `# Project guide

This repository is a TypeScript monorepo for an online bookstore: a Next.js web app, a Node API and shared packages.
Read this file before making changes. Keep answers short and change only what the task needs.

## Commands
- Install: pnpm install
- Dev server: pnpm dev (web on :3000, api on :4000)
- Tests: pnpm test (Vitest), pnpm test:e2e (Playwright)
- Lint and types: pnpm lint && pnpm typecheck
`;
const modules = ["auth","billing","catalog","search","cart","checkout","orders","inventory","shipping","reviews","recommendations","notifications","admin","analytics","i18n","media","accounts","coupons","wishlist","returns","payments","tax","gift-cards","subscriptions","feature-flags","audit-log","rate-limit","webhooks","sitemap","seo","email","sms","exports","imports","jobs","cache","storage","logging","metrics","tracing","health","config","permissions","teams","invoices","refunds","pricing","bundles","authors","publishers","series","genres","events","newsletter","support","faq","blog","cms","banners","store-locator"];
const rules = [
 "Put new {m} code under packages/{m}/src and export it through packages/{m}/src/index.ts; never import from another package's internal files.",
 "Every public function in {m} needs a JSDoc comment that states its inputs, its return value and the errors it can throw.",
 "Database access for {m} goes through the {m}Repository class; do not call Prisma directly from route handlers or React components.",
 "Write unit tests for {m} next to the source as *.test.ts; aim for the happy path plus one failure case for each exported function.",
 "Validate every request body that reaches the {m} API with the zod schema in packages/{m}/src/schema.ts before using it.",
 "Log {m} errors with logger.error({ module: '{m}', err }) and never log personal data such as emails, addresses or card numbers.",
 "Feature work in {m} must sit behind a flag named {m}.<feature> in feature-flags until product signs it off.",
 "The {m} module uses money values in integer cents; convert to a display string only in the UI layer with formatMoney().",
 "When {m} needs to call another service, use the typed client in packages/clients and add a timeout of at most 5 seconds.",
 "Migrations for {m} live in packages/db/migrations with a timestamp prefix; never edit a migration that has already shipped.",
 "User-facing strings in {m} go through t('{m}.<key>') so they can be translated; do not hard-code English text in components.",
 "Keep {m} React components small: one component per file, props typed with an interface named <Component>Props."];
let s = head, i = 0;
while (Buffer.byteLength(s) < 52 * 1024) {
  const m = modules[i % modules.length];
  const picks = [0, 1, 2, 3].map(k => rules[(i * 5 + k * 3) % rules.length].split('{m}').join(m));
  s += `\n## Module: ${m}\n` + picks.map(r => '- ' + r).join('\n') + '\n';
  i++;
}
const out = process.argv[2] || '.';
for (const kb of [1, 5, 10, 25, 50]) {
  let t = s.slice(0, kb * 1024); t = t.slice(0, t.lastIndexOf('\n') + 1);
  fs.mkdirSync(path.join(out, kb + 'kb'), { recursive: true });
  fs.writeFileSync(path.join(out, kb + 'kb', 'guide.md'), t);
  console.log(kb, Buffer.byteLength(t));
}
