# Fixture-directory harness extension (proof-of-firing v2)

> Spec for extending `scripts/validate-fixture-proof-of-firing.mjs` so the 29
> meta / multi-file gates that the single-`FIXTURE_FILE` harness cannot model
> get real proof-of-firing coverage. Tracks HARDENING_ROADMAP §13g-3.

## Problem

The v1 harness proves a gate fires by pointing it at ONE fixture file
(`FIXTURE_FILE=<abs path>`) and asserting `violating` exits non-zero /
`passing` exits zero. That models per-file content scanners perfectly (34/63
gates converted this way). It cannot model gates whose input is **not a single
file**:

| Category             | Examples                                                                                                                                                    | Why single-file fails                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Registry readers     | check-registry, check-validator-wiring, audit-gate-purity, audit-soft-gates, audit-gates-supportjson, generate-strength-report, audit-gate-replaceability   | read `docs/guardrails/registry.json` (+ `.husky/`) as their input, not a scanned file |
| Two-file / snapshot  | check-token-renames, check-manifest-schema-semver, check-snapshot-staleness, check-template-source-of-truth, check-token-rebake-needed, check-css-integrity | compare a source-of-truth file against a committed snapshot/second file               |
| Manifest-dependent   | audit-tokens, audit-tiers, check-manifest-drift, check-binding-drift, check-asset-manifest, check-attributions, audit-batch-deliverables                    | read `public/hds-manifest.json` / `public/assets/manifest.json`                       |
| deps / SBOM / bundle | audit-deps, audit-sbom, audit-bundle                                                                                                                        | read `package.json` + lockfile / build output                                         |
| Tenant tree          | check-tenant-tokens                                                                                                                                         | needs `hirobius.tokens.json` base + a `tenants/<slug>/` tree                          |
| Browser / external   | check-route-smoke, audit-figma-system, check-code-connect, check-security-baseline                                                                          | need a running browser / external service                                             |

## Design — `FIXTURE_DIR` directory fixtures

Add a second fixture shape alongside the existing file pair. A gate's fixtures
become a **synthetic mini-root**: a directory holding exactly the input files
the gate reads, arranged the way the gate expects.

### Disk convention

```
fixtures/<gate-id>/
  violating.example.d/      # directory fixture (the `.d` suffix marks it)
    registry.json           # whatever inputs the gate reads, relative to the dir
    .husky/pre-commit
  passing.example.d/
    registry.json
    .husky/pre-commit
```

- A gate uses **either** file fixtures (`violating.example.<ext>`) **or**
  directory fixtures (`violating.example.d/`), never both. Directory fixtures
  take precedence when present.
- **Stub marker:** a directory fixture is a STUB while it contains a top-level
  `.stub` sentinel file. Remove `.stub` (and add real content) to graduate it.
  This mirrors the `// TODO:` marker used by file stubs.

### Runner contract

For a directory fixture the harness invokes:

```
node <gateScript> --fixture-mode      # env: HDS_FIXTURE_MODE=1, FIXTURE_DIR=<abs dir>
```

against `violating.example.d/` (must exit non-zero) then `passing.example.d/`
(must exit zero), identical to the file flow.

### Gate-side contract

A gate opts in by treating `FIXTURE_DIR` as its input root when set:

```js
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureDir = process.env.FIXTURE_DIR;
// Resolve every input path the gate reads against fixtureDir when in dir-fixture mode:
const REGISTRY = fixtureDir
  ? join(fixtureDir, 'registry.json')
  : join(ROOT, 'docs/guardrails/registry.json');
```

This is a NO-OP outside the harness (`FIXTURE_DIR` unset in normal runs), so
whole-tree behavior is byte-identical — the same guarantee file fixtures give.

Gates that genuinely need a browser or a live external service (`check-route-smoke`,
`audit-figma-system`, `check-code-connect`) still cannot be proven by a static
fixture and stay stubbed; they are out of scope for this extension and are
tracked as permanent `needs-runtime` exceptions.

## Harness changes (`validate-fixture-proof-of-firing.mjs`)

1. Per gate, resolve fixtures in this order:
   a. **Directory fixtures** — if `violating.example.d/` and `passing.example.d/`
   both exist as directories → directory mode.
   b. else **file fixtures** — existing `EXTS` loop (unchanged).
2. Stub detection: directory mode → stub if `<dir>/.stub` exists. File mode →
   unchanged (`isStubFile`).
3. mtime cache: directory mode → max mtime over the directory tree (so edits to
   any contained file bust the cache).
4. Runner: directory mode passes `FIXTURE_DIR=<abs dir>` instead of
   `FIXTURE_FILE`; same exit-code assertions.
5. Reporting / counts: directory reals and stubs fold into the existing
   `withRealFixtures` / `withStubFixtures` tallies — no schema change, so the
   A3 strength dimension and the stub-ratchet keep working unmodified.

## Backward compatibility

- The 34 existing file fixtures are untouched (directory mode only triggers when
  `.example.d/` dirs exist).
- JSON output schema is unchanged.
- `check-fixture-stubs-ratchet` keeps reading `withStubFixtures` — directory
  graduations lower it exactly like file graduations.
