# OPS De-dupe Inventory — owner-side hash manifest

Generated: 2026-06-18T22:07:44.781Z
Source repo: hirobius/hirobius-design-system @ branch claude/design-system-governance-audit-45yv04
Files hashed: 196 | Token paths (tokens.lock.json): 323

## What this is

A SHA-256 + byte-size manifest of every canonical governance doc, token file,
and pipeline script in the design-system (owner) repo. It exists to unblock the
ops-side de-dupe **without** needing the DS repo checked out in the ops container
(audit option 2).

## How ops uses it

For each file ops vendored a copy of, hash the ops copy and compare:

```bash
# in the ops repo, for a candidate duplicate:
sha256sum path/to/ops-copy.ext
# compare against the sha256 in OPS_DEDUPE_INVENTORY.json for the same logical file
```

- **hash identical**  -> exact duplicate of owner canon -> SAFE to delete in ops,
  replace with a consume-from-package import (@hirobius/design-system/...).
- **hash differs**     -> ops copy has DRIFTED from owner canon -> do NOT blind-delete;
  diff and reconcile (ops drift is a finding, not a clean removal).
- **owner = MISSING**  -> file ops copied does not exist in owner canon anymore
  (e.g. ops vendored a since-deleted artifact) -> review for removal.

## Token system check (fastest signal)

If ops' copy of `hirobius.tokens.json` and `tokens.lock.json` hash-match the
owner values below, the entire token system is byte-identical and ops should drop
its copy + the token pipeline and consume `@hirobius/design-system/tokens` +
`/tokens.css` instead:

- `hirobius.tokens.json` -> `77a9b0fbe9dac5be74c7df8c50afdd647f5cfd073d0ff0b9f9aa50ca3655976b`
- `tokens.lock.json`     -> `0f76db329cc7e17897cba858a399aef70e5686d209dbf69f5ee727d01b87f80e`
- `public/hds-manifest.json` -> `a2d20281aa880523ef8d363a6423cc65c3e28179dca14a0e9af6c2132d6dc190`

## Full manifest

| File (owner path) | Group | Bytes/Status | sha256 (first 16) |
|---|---|---|---|
| `CLAUDE.md` | governance_docs | 7008 | 856d1a9f04a73feb |
| `AGENTS.md` | governance_docs | 4520 | d348a40f716f8b90 |
| `TOKEN_GOVERNANCE.md` | governance_docs | 4996 | 77709cb6474a0856 |
| `TOKEN_MIGRATION.md` | governance_docs | 999 | 0f1db4ddd9e5901f |
| `SYSTEMS_REGISTRY.md` | governance_docs | 13256 | 2370e0bf11136c8c |
| `OPERATING_MAP.md` | governance_docs | 2461 | d569f0d21c65940e |
| `BACKLOG.md` | governance_docs | 7506 | 87d937de49260d18 |
| `README.md` | governance_docs | 4557 | 094ec07d93e80b3e |
| `CONSUMING.md` | governance_docs | 2664 | fbf04997b971f37f |
| `docs/CONSUMING.md` | governance_docs | 4600 | 2a84eab849ebc85e |
| `HDS_COMPLIANCE_LOG.md` | governance_docs | 1523 | fbfd5812618cb519 |
| `DECISIONS.md` | governance_docs | 434 | b0e0661225d3d5eb |
| `PROCESS.md` | governance_docs | 539 | fab3337cc04b0e31 |
| `DESIGN.md` | governance_docs | 14610 | 407cbd4335c8716d |
| `DESIGN.source.md` | governance_docs | 7109 | 757daac0e68f6c4d |
| `DESIGN-HANDOFF.md` | governance_docs | 27941 | 00a0e1a4cabac20c |
| `CONTRIBUTING.md` | governance_docs | 6404 | 027a8288d6e4f76e |
| `AGENT_CONTEXT_SYSTEM.md` | governance_docs | 791 | b4cb51d26062de79 |
| `TYPOGRAPHY_MIGRATION_GUIDE.md` | governance_docs | 8947 | 2d2ac59282d31a7b |
| `TYPOGRAPHY_REFACTOR.json` | governance_docs | 4714 | 3e0f7e1486d6d800 |
| `hirobius.tokens.json` | token_files | 66806 | 77a9b0fbe9dac5be |
| `tokens.lock.json` | token_files | 10246 | 0f76db329cc7e178 |
| `hirobius.tenant-tokens.schema.json` | token_files | 5324 | ce5315c91f047ecd |
| `src/styles/tokens.css` | token_files | 26461 | 8eba745aadc5af07 |
| `src/app/design-system/generated-tokens.ts` | token_files | 18466 | 2f57c5c9d387521f |
| `tailwind.config.tokens.cjs` | token_files | 2346 | c5b84769abc88263 |
| `public/hds-manifest.json` | token_files | 324386 | a2d20281aa880523 |
| `scripts/a11y-schema-check.mjs` | pipeline_scripts | 6610 | 47cf611d05d6a3f8 |
| `scripts/activity-log.mjs` | pipeline_scripts | 2973 | fd0b8c96acc737df |
| `scripts/audit-batch-deliverables.mjs` | pipeline_scripts | 11735 | cb3faf962779fddd |
| `scripts/audit-bundle.mjs` | pipeline_scripts | 1350 | c51788466cd454c2 |
| `scripts/audit-component-integrity.mjs` | pipeline_scripts | 13504 | 451a3b890fcff309 |
| `scripts/audit-deps.mjs` | pipeline_scripts | 1931 | 7c819ba5d129a7e9 |
| `scripts/audit-exceptions.mjs` | pipeline_scripts | 8039 | 4a0237720baec8ec |
| `scripts/audit-figma-system.mjs` | pipeline_scripts | 19128 | 1aa688aba958ace2 |
| `scripts/audit-gate-purity.mjs` | pipeline_scripts | 18298 | b9b9646a5f2cfed3 |
| `scripts/audit-gate-replaceability.mjs` | pipeline_scripts | 57364 | f0dacc5624109f64 |
| `scripts/audit-gates-supportjson.mjs` | pipeline_scripts | 7907 | 7117a18407cb54fc |
| `scripts/audit-guardrails.js` | pipeline_scripts | 9969 | d682bfc84a2e2b0b |
| `scripts/audit-pages.mjs` | pipeline_scripts | 4039 | 1fc0e94c8beabccd |
| `scripts/audit-sbom.mjs` | pipeline_scripts | 1654 | 55de78ad840fbcc1 |
| `scripts/audit-soft-gates.mjs` | pipeline_scripts | 16567 | 797a01d06d72c91e |
| `scripts/audit-strengths.mjs` | pipeline_scripts | 13163 | b9464cc2af6d8a6c |
| `scripts/audit-tiers.mjs` | pipeline_scripts | 15668 | 6e7dd5027330cdf0 |
| `scripts/audit-tokens.mjs` | pipeline_scripts | 40975 | b22a629929b08126 |
| `scripts/auth-middleware.mjs` | pipeline_scripts | 5536 | 9ddc4a57a1486780 |
| `scripts/build-design-md.mjs` | pipeline_scripts | 18130 | f0e38cc6d4f06032 |
| `scripts/build-figma-masters.mjs` | pipeline_scripts | 2895 | 70c349f24f3d1d1c |
| `scripts/build-figma-variables.mjs` | pipeline_scripts | 20548 | df8a232c2b397d89 |
| `scripts/build-handoff.mjs` | pipeline_scripts | 21231 | 059700ae8fa67f4a |
| `scripts/build-hds-tokens.mjs` | pipeline_scripts | 6568 | f5e992d965aba007 |
| `scripts/build-llms-txt.mjs` | pipeline_scripts | 131 | 050e779ad8fd6be2 |
| `scripts/build-roadmap-data.mjs` | pipeline_scripts | 16414 | eff22b46f119cdfd |
| `scripts/build-token-index.mjs` | pipeline_scripts | 11794 | c0a2e4d42ee70a7e |
| `scripts/build-token-quick-reference.mjs` | pipeline_scripts | 5934 | 520ddee1584f3b44 |
| `scripts/build-tokens.mjs` | pipeline_scripts | 67476 | 573370138861a83b |
| `scripts/case-study-draft.mjs` | pipeline_scripts | 3177 | e1622850966d317b |
| `scripts/check-asset-manifest.mjs` | pipeline_scripts | 5667 | bcc736d238a817f4 |
| `scripts/check-attributions.mjs` | pipeline_scripts | 2211 | 531230117f9f4be3 |
| `scripts/check-binding-drift.mjs` | pipeline_scripts | 5315 | ac4368eddbc3ea66 |
| `scripts/check-brand.mjs` | pipeline_scripts | 5668 | 57f6fcd1122dbfd7 |
| `scripts/check-code-connect.mjs` | pipeline_scripts | 2023 | 2bb71dea34878e41 |
| `scripts/check-contrast.mjs` | pipeline_scripts | 7411 | e3c2ebbf2b2e480d |
| `scripts/check-css-integrity.mjs` | pipeline_scripts | 4782 | 203ae28de853363f |
| `scripts/check-dimensions.mjs` | pipeline_scripts | 4170 | c43f3d98fcff730f |
| `scripts/check-doc-structure.mjs` | pipeline_scripts | 11604 | b8a831c080c4220e |
| `scripts/check-exemptions.mjs` | pipeline_scripts | 3539 | d8de515b77148f82 |
| `scripts/check-fixture-stubs-ratchet.mjs` | pipeline_scripts | 6686 | f0dc348f3a704368 |
| `scripts/check-focus-states.mjs` | pipeline_scripts | 6551 | 1fffbc139c0118ea |
| `scripts/check-frozen-demos.mjs` | pipeline_scripts | 1885 | 438c3c1320223c77 |
| `scripts/check-hardcoded-breakpoints.mjs` | pipeline_scripts | 4778 | a3039f5541e9e31a |
| `scripts/check-hardcoded-colors.mjs` | pipeline_scripts | 9393 | f850677ba6575293 |
| `scripts/check-hardcoded-spacing.mjs` | pipeline_scripts | 7271 | f44b3cac2b2ba2f3 |
| `scripts/check-legacy-hds-vars.mjs` | pipeline_scripts | 3289 | 085f681a7dda4957 |
| `scripts/check-licenses.mjs` | pipeline_scripts | 2416 | 2e1328660fa00c5d |
| `scripts/check-link-integrity.mjs` | pipeline_scripts | 16143 | 3c30c25031e8eeb0 |
| `scripts/check-manifest-drift.mjs` | pipeline_scripts | 1459 | c4b1f669d3b68bb5 |
| `scripts/check-manifest-schema-semver.mjs` | pipeline_scripts | 5347 | 679b52345b60afca |
| `scripts/check-mono-roles.mjs` | pipeline_scripts | 1888 | c3af100c68a2d99a |
| `scripts/check-motion.mjs` | pipeline_scripts | 8482 | 092ca9c2503bb626 |
| `scripts/check-og-meta.mjs` | pipeline_scripts | 3509 | e639868a59b18679 |
| `scripts/check-page-shell.mjs` | pipeline_scripts | 2138 | 9fe9a80c0e74ec36 |
| `scripts/check-reduced-motion.mjs` | pipeline_scripts | 5555 | 01a337a74afe548b |
| `scripts/check-ref-forwarding.mjs` | pipeline_scripts | 4166 | 17313c00164869cd |
| `scripts/check-registry.mjs` | pipeline_scripts | 3243 | c8ab2248dfabe0ad |
| `scripts/check-route-coverage.mjs` | pipeline_scripts | 5603 | 79b1a28375fa210c |
| `scripts/check-route-smoke.mjs` | pipeline_scripts | 3598 | 1f822c301ed8087c |
| `scripts/check-secrets.mjs` | pipeline_scripts | 4564 | a0217b81f56e9912 |
| `scripts/check-security-baseline.mjs` | pipeline_scripts | 5756 | e051fa374dde0751 |
| `scripts/check-snapshot-staleness.mjs` | pipeline_scripts | 9944 | 47de8f4e978bbcff |
| `scripts/check-source-canon.mjs` | pipeline_scripts | 18897 | bc9079ca420e98aa |
| `scripts/check-style-discipline.mjs` | pipeline_scripts | 12883 | 9ba6b0bf71d71403 |
| `scripts/check-template-source-of-truth.mjs` | pipeline_scripts | 7589 | bb9fa6dd75589f02 |
| `scripts/check-tenant-tokens.mjs` | pipeline_scripts | 4579 | 3b0e7c14e4bb48b3 |
| `scripts/check-tier-bypass.mjs` | pipeline_scripts | 3927 | c3d9d2ba940d331f |
| `scripts/check-token-descriptions.mjs` | pipeline_scripts | 8299 | 5afb3f806ac196e9 |
| `scripts/check-token-paths-ratchet.mjs` | pipeline_scripts | 13889 | 4e67ce0a4e7ee783 |
| `scripts/check-token-rebake-needed.mjs` | pipeline_scripts | 6954 | 32765a24400ba2e7 |
| `scripts/check-token-renames.mjs` | pipeline_scripts | 5030 | b611ad75dd60222e |
| `scripts/check-token-structure.mjs` | pipeline_scripts | 6511 | c53c5e4588c9092b |
| `scripts/check-typography-discipline.mjs` | pipeline_scripts | 13357 | 164203d9c0413a81 |
| `scripts/check-unresponsive-grids.mjs` | pipeline_scripts | 6756 | e9b88b7f2f020844 |
| `scripts/check-validator-wiring.mjs` | pipeline_scripts | 21432 | fadbfdb5665093f7 |
| `scripts/component-discovery.mjs` | pipeline_scripts | 7676 | 5a9f83ba0af4cd81 |
| `scripts/convert-incoming-assets.mjs` | pipeline_scripts | 6232 | 89767499a7aa2a32 |
| `scripts/correlation.mjs` | pipeline_scripts | 8987 | cc0b37e9c85754af |
| `scripts/derive-routes.mjs` | pipeline_scripts | 4209 | 9dc2ab238d78b354 |
| `scripts/dispatch-pod.mjs` | pipeline_scripts | 7103 | 26101da39da3d993 |
| `scripts/enrich-manifest.mjs` | pipeline_scripts | 13532 | c6db73669ad72644 |
| `scripts/figma-bridge-smoke.mjs` | pipeline_scripts | 8525 | 3ac4d96f1c273527 |
| `scripts/figma-console-snippet.js` | pipeline_scripts | 3770 | 0c162e16e7a50bd2 |
| `scripts/figma-diff.mjs` | pipeline_scripts | 6718 | a9af32605ffc5bc0 |
| `scripts/figma-library-generate.mjs` | pipeline_scripts | 20545 | fd576f2fa20ac072 |
| `scripts/figma-parity-check.mjs` | pipeline_scripts | 8509 | aa288183e1ec616f |
| `scripts/generate-changelog.mjs` | pipeline_scripts | 8221 | 65b161d115e6e9ea |
| `scripts/generate-closure-plan.mjs` | pipeline_scripts | 9201 | 8e04120ed094db04 |
| `scripts/generate-component-api.mjs` | pipeline_scripts | 17477 | 68cfe50d038d257e |
| `scripts/generate-component-changelogs.mjs` | pipeline_scripts | 4040 | f2a8d6fca4ba6ecd |
| `scripts/generate-llms-txt.mjs` | pipeline_scripts | 9722 | 26c6c1a34a48c385 |
| `scripts/generate-manifest-projection.mjs` | pipeline_scripts | 3483 | 27ca87a5aacd4541 |
| `scripts/generate-manifest.mjs` | pipeline_scripts | 10480 | f98e8474752f2658 |
| `scripts/generate-portal-token.mjs` | pipeline_scripts | 4417 | 38d9993c1d46291e |
| `scripts/generate-security-posture.mjs` | pipeline_scripts | 5801 | c0d0691b05402e2d |
| `scripts/generate-sitemap.mjs` | pipeline_scripts | 2964 | 138e727019b3f481 |
| `scripts/generate-strength-report.mjs` | pipeline_scripts | 54649 | e0d6dfb603c4e00d |
| `scripts/generate-system-atlas.mjs` | pipeline_scripts | 19511 | 3db2559586142ddc |
| `scripts/generate-to-figma.mjs` | pipeline_scripts | 31797 | 12e86719bef9d676 |
| `scripts/generate-visual-catalog.mjs` | pipeline_scripts | 4601 | 7c46336e257a0354 |
| `scripts/hds-bridge.mjs` | pipeline_scripts | 38521 | d54cdc3f0ad6ec12 |
| `scripts/hds-jsx-compiler.mjs` | pipeline_scripts | 22855 | 3eca815d81ae1790 |
| `scripts/hds-lint.js` | pipeline_scripts | 18388 | 57f6663e43b8e133 |
| `scripts/llm-stream-bridge.mjs` | pipeline_scripts | 4302 | 1cd908b11377de87 |
| `scripts/normalize-figma-snapshot.mjs` | pipeline_scripts | 6680 | d2d90cce1336fad3 |
| `scripts/prerender.mjs` | pipeline_scripts | 8689 | 77c28ff56f5e1921 |
| `scripts/print-health-commit.mjs` | pipeline_scripts | 926 | 8532a3159ffb5822 |
| `scripts/project-component-spec.mjs` | pipeline_scripts | 23631 | 6406117827c11847 |
| `scripts/promote-to-core.mjs` | pipeline_scripts | 4174 | 165adcf3b1fd53f8 |
| `scripts/promote.mjs` | pipeline_scripts | 2871 | 1ea2ed99bb2eae86 |
| `scripts/record-health.mjs` | pipeline_scripts | 1976 | abfc527ada868aea |
| `scripts/refresh-firing-stats.mjs` | pipeline_scripts | 4259 | 78723197f27c2e56 |
| `scripts/run-gates.mjs` | pipeline_scripts | 18403 | ffe815bfe33ae0ed |
| `scripts/run-validator-tests.mjs` | pipeline_scripts | 3192 | f73340d626f4c524 |
| `scripts/sales-pipeline.mjs` | pipeline_scripts | 4725 | 34137e57fbb7b669 |
| `scripts/sales-proposal.mjs` | pipeline_scripts | 4666 | 65a6c3c7016210b4 |
| `scripts/scaffold-component.mjs` | pipeline_scripts | 5908 | 6fdd16986cabaa02 |
| `scripts/scaffold-tenant.mjs` | pipeline_scripts | 12584 | 2187140a75287de0 |
| `scripts/self-heal.mjs` | pipeline_scripts | 10671 | 48af3cf7ca4eca92 |
| `scripts/setup-figma-canvas.mjs` | pipeline_scripts | 3751 | 4c7b93e45736f349 |
| `scripts/setup-hooks.mjs` | pipeline_scripts | 996 | 59e6b9cb9d74c851 |
| `scripts/snapshot-token-paths.mjs` | pipeline_scripts | 2641 | 1fffc342645971a6 |
| `scripts/swiss-canon-check.mjs` | pipeline_scripts | 11641 | 57553507c45ca74a |
| `scripts/sync-asset-manifest.mjs` | pipeline_scripts | 4629 | bd6865eb7a3a1541 |
| `scripts/sync-hds-registry.mjs` | pipeline_scripts | 6197 | d96e64317f114637 |
| `scripts/sync-icons.mjs` | pipeline_scripts | 2572 | 0f29d234e2a1963d |
| `scripts/sync-system-health.mjs` | pipeline_scripts | 25116 | 2e1d452a8c604183 |
| `scripts/test-doc-pages-snapshot.mjs` | pipeline_scripts | 6986 | b8155fc2eed0998d |
| `scripts/test-figma-masters-snapshot.mjs` | pipeline_scripts | 3202 | 59db01e8bf730bbe |
| `scripts/test-phase1.mjs` | pipeline_scripts | 5036 | ea286e1733eca8ba |
| `scripts/test-prompt-regression.mjs` | pipeline_scripts | 9676 | 4d5bb58611ee63c8 |
| `scripts/test-retry-loop.mjs` | pipeline_scripts | 3679 | 39d59593e74d1839 |
| `scripts/ui-lint.mjs` | pipeline_scripts | 1947 | ff94a16ffd64fe79 |
| `scripts/update-commit-history-cron.mjs` | pipeline_scripts | 1704 | 60478f0fccee7608 |
| `scripts/update-commit-history.mjs` | pipeline_scripts | 1367 | ca32fc16938aaf36 |
| `scripts/update-journal.mjs` | pipeline_scripts | 42517 | 7f709676202bd874 |
| `scripts/update-precommit-hash.mjs` | pipeline_scripts | 3365 | 622b0c0d8a011da0 |
| `scripts/validate-fixture-proof-of-firing.mjs` | pipeline_scripts | 16672 | c6f3c8c0ec19c4c1 |
| `scripts/validate-guardrail-registry.mjs` | pipeline_scripts | 4604 | 39c5c941b2ae7330 |
| `scripts/validate-manifest.mjs` | pipeline_scripts | 8934 | 94c9f7bd450452b0 |
| `scripts/verify-roadmap-sync.mjs` | pipeline_scripts | 1565 | 03573651a7487969 |
| `scripts/verify-tokens.mjs` | pipeline_scripts | 11200 | 23e79db5b1549d9d |
| `scripts/visual-ingest.mjs` | pipeline_scripts | 8373 | 9ae01a134efe4982 |
| `scripts/watch-roadmap.mjs` | pipeline_scripts | 2117 | 4159d66c8506f534 |
| `validators/10f-1-figma-snapshot-adapter.mjs` | validators | 6576 | 34beced69d41caf3 |
| `validators/10f-7-xpath-query-endpoint.mjs` | validators | 3928 | 053292af3e8128df |
| `validators/a11y-validator.mjs` | validators | 1927 | 615538258171a652 |
| `validators/auth.mjs` | validators | 5152 | df30be44fdaa6025 |
| `validators/binding-completeness.mjs` | validators | 5123 | 7b24b5710174bf3a |
| `validators/canon-rules.mjs` | validators | 5762 | cd04e00025fae86b |
| `validators/compiler.mjs` | validators | 650 | 69ee56794a19421f |
| `validators/contrast.mjs` | validators | 8952 | 9acd659f60179880 |
| `validators/correlation.mjs` | validators | 3641 | 3dd4851536865b17 |
| `validators/envelope.mjs` | validators | 3299 | d34c2095b198160c |
| `validators/index.mjs` | validators | 1959 | ecff38dda96d4e63 |
| `validators/lint.mjs` | validators | 5393 | 1fd271b59503db1c |
| `validators/manifest-validator.mjs` | validators | 3567 | d2f1c02dfcac38e0 |
| `validators/motion-perf.mjs` | validators | 10383 | 161d723d3ead1724 |
| `validators/parse-jsx.mjs` | validators | 1081 | df8f42de02b706c4 |
| `validators/runtime-error-channel.mjs` | validators | 5815 | 0ad8fb0b09eaca34 |
| `validators/swiss-canon.mjs` | validators | 13671 | 3398e55480d56cf2 |
| `validators/token-sync.mjs` | validators | 7311 | e9162ccbb4147750 |
| `validators/token-validator.mjs` | validators | 2914 | 34bd982facd24a13 |
| `protocol/envelope.mjs` | protocol | 7513 | 098d5c47be59d582 |
| `protocol/figma-snapshot.schema.json` | protocol | 7527 | c64c9f5715f8f060 |
| `pipeline/figma-masters-batch.mjs` | pipeline_dir | 36229 | f41f755c1bb8423b |
| `pipeline/format-correction.mjs` | pipeline_dir | 1375 | e0faed75f0c15b0c |
| `pipeline/retry-loop.mjs` | pipeline_dir | 4092 | 8fef5d70c074dced |

> Full 64-char hashes are in OPS_DEDUPE_INVENTORY.json (machine-readable).
