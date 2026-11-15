# ESLint auto-fix

Never run a full-codebase `pnpm lint:fix`. It can merge unrelated code blocks into syntax errors.

Fix one rule at a time, and verify each pass.

1. Run `pnpm exec eslint src --fix --rule '{"<rule-name>": "error"}'`.
2. Run `pnpm typecheck && pnpm exec vite build`.
3. If one of them fails, stop and report.

- If the auto-fix of one rule touches more than 50 files, stop and ask Adrian.
- Safe to auto-fix: `@typescript-eslint/no-unused-vars`, `prefer-const`, `no-var`, `quotes`, `semi`, `eol-last`, `comma-dangle`.
- Never auto-fix `react-hooks/exhaustive-deps`. It causes stale closures.
- Never auto-fix a rule that rewrites code blocks or touches more than one statement.
