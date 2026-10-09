#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-upgrade-css.mjs — every CSS change since the last release has an
 * upgrade step, and a CSS removal rides a breaking bump (hds#449).
 *
 * Why: 0.20.0 removed 23 hds-* classes and 129 Tailwind utilities from
 * styles.css and tokens.css, and 0.17.0 changed ten primitive type sizes;
 * the upgrade gate (check-upgrade-ledger.mjs) reads the source tree with no
 * build, so it saw none of it, and a consumer using `hds-focus` or a token
 * value got no step. This gate reads the built stylesheets instead: the CSS
 * contract build:lib writes (dist/css-contract.json,
 * scripts/build-css-contract.mjs), against the css section of the newest
 * release snapshot at or below package.json's version
 * (docs/api/releases/<v>.json), with the facts of scripts/upgrade/diff.mjs.
 *
 * It fails when:
 *
 *   1. dist/css-contract.json is missing, or is not the contract of the
 *      stylesheets beside it (built before the last CSS change);
 *   2. the release snapshot has no css section (recorded before hds#449);
 *   3. a custom property, an hds-* or manifest-public class, or an
 *      @font-face left a stylesheet, or a variable's value changed in a
 *      context (:root, dark, compact, a [data-brand], an @media), and no step
 *      in upgrade/pending/*.json lists the fact (a Tailwind utility that left
 *      is reported, not failed: no consumer should rely on HDS shipping one);
 *   4. a removed variable or public class is covered only by a step that is
 *      not breaking (kind removed, moved, renamed or folded, or impact
 *      breaking), or the pending changesets bump by less than minor below
 *      1.0 (major from 1.0) while one is pending (check-upgrade-ledger counts
 *      the same steps as breaking, so both gates agree on the bump);
 *   5. a note step lists a CSS fact the build does not have (a reverted
 *      change), which `pnpm changeset:version` would refuse;
 *   6. a variable no release snapshot since the previous one declares, that
 *      an older release declared, comes back with a different value in a
 *      context both declare: the name means something else now, and a
 *      consumer's old override would apply to it. Pick a new name.
 *
 * The fix it names is `pnpm upgrade:note`, which pre-fills a removed step for
 * a removal and a value-changed step (impact look) for a value change, each
 * detecting the variable or class in consumer code (scripts/upgrade/note.mjs).
 *
 * Usage:
 *   node scripts/check-upgrade-css.mjs [--root <dir>] [--json] [--skip-build]
 *
 * It never builds: smoke:consumer runs it last, after its own build:lib, and
 * `pnpm smoke:consumer --skip-build` (pnpm release) hands it --skip-build,
 * which it ignores. CI and the Version PR run smoke:consumer.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONTRACT_FILE,
  buildCssContract,
  formatContract,
  readCssContract,
} from './lib/css-contract.mjs';
import { emitResult, hasJsonFlag } from './lib/gate-output.mjs';
import { isCssFactId } from './upgrade/diff.mjs';
import {
  BUMP_RANK,
  breakingBump,
  bumpBetween,
  factImpact,
  needsStep,
  stepIsBreaking,
} from './upgrade/ledger.mjs';
import {
  PENDING_DIR,
  RELEASES_SNAPSHOTS,
  newFacts,
  noteSteps,
  readUpgradeState,
} from './upgrade/pending.mjs';
import { compareVersions } from './upgrade/schema.mjs';
import { PACKAGE } from './upgrade/snapshot.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NOTE = 'pnpm upgrade:note';
const BUILD = 'pnpm build:lib';

const violation = (file, rule, message, extra = {}) => ({
  file,
  line: null,
  rule,
  severity: 'error',
  message,
  ...extra,
});

const where = (fact) => fact.bundles.join(', ');
const shown = (value) => (value === null ? 'nothing' : value);

/** A CSS fact in words, with the step that fixes it. */
function describeCssFact(fact) {
  switch (fact.kind) {
    case 'css-var-removed':
      return `${fact.name} is no longer declared in ${where(fact)}. Run ${NOTE}: it adds a removed step (breaking, so the changeset is minor below 1.0).`;
    case 'class-removed':
      return `.${fact.name} is no longer in ${where(fact)}. Run ${NOTE}: it adds a removed step (breaking, so the changeset is minor below 1.0).`;
    case 'css-var-changed':
      return `${fact.name} in ${fact.context} went from ${shown(fact.from)} to ${shown(fact.to)} (${where(fact)}). ${NOTE} adds a value-changed step (impact look); say what looks different in its plain line.`;
    case 'font-face-removed':
      return `the @font-face ${fact.family} ${fact.weight} ${fact.style} is no longer in ${where(fact)}. Run ${NOTE}: it adds a look step.`;
    default:
      return fact.id;
  }
}

/** Every committed release snapshot, oldest first. */
function releaseVersions(root) {
  const dir = join(root, RELEASES_SNAPSHOTS);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\.json$/.test(file))
    .map((file) => file.slice(0, -'.json'.length))
    .sort(compareVersions);
}

/** name -> "bundle\0context" -> value, across every stylesheet of a contract. */
function variableValues(css) {
  const out = new Map();
  for (const [key, bundle] of Object.entries(css?.bundles ?? {})) {
    for (const [name, contexts] of Object.entries(bundle.variables ?? {})) {
      const values = out.get(name) ?? new Map();
      for (const [context, value] of Object.entries(contexts)) {
        values.set(`${key}\0${context}`, value);
      }
      out.set(name, values);
    }
  }
  return out;
}

/**
 * Variables the build declares that the previous release did not, but an
 * older release did, with a value that differs in a stylesheet and context
 * both declare: rule 6.
 */
function reusedNames(root, state, contract) {
  const versions = releaseVersions(root).filter(
    (v) => compareVersions(v, state.previousVersion) < 0,
  );
  const previous = variableValues(state.previousCss);
  const now = variableValues(contract);
  const candidates = [...now.keys()].filter((name) => !previous.has(name)).sort();
  if (candidates.length === 0) return [];
  const older = versions
    .reverse()
    .map((version) => {
      const snapshot = JSON.parse(
        readFileSync(join(root, RELEASES_SNAPSHOTS, `${version}.json`), 'utf8'),
      );
      return { version, values: variableValues(snapshot.css) };
    })
    .filter(({ values }) => values.size > 0);
  const out = [];
  for (const name of candidates) {
    const last = older.find(({ values }) => values.has(name));
    if (!last) continue;
    const was = last.values.get(name);
    const differs = [...now.get(name)].filter(
      ([at, value]) => was.has(at) && was.get(at) !== value,
    );
    if (differs.length === 0) continue;
    const [at, value] = differs[0];
    const [bundle, context] = at.split('\0');
    out.push(
      violation(
        CONTRACT_FILE,
        'css-name-reused',
        `${name} was removed after ${last.version} and is back with another value: ${was.get(at)} then, ${value} now (${bundle}, ${context}). A consumer's old override or fallback would now apply to something else, so give the new variable a new name.`,
        { name },
      ),
    );
  }
  return out;
}

/** The violations of rules 3 to 5 for the CSS facts since the last release. */
function factViolations(state) {
  const steps = state.notes.flatMap(noteSteps);
  const facts = newFacts(state).filter((fact) => isCssFactId(fact.id));
  const coveredBy = new Map();
  for (const step of steps) {
    for (const id of Array.isArray(step.facts) ? step.facts : []) {
      coveredBy.set(id, [...(coveredBy.get(id) ?? []), step]);
    }
  }
  const out = [];
  for (const fact of facts.filter((f) => needsStep(f))) {
    const covering = coveredBy.get(fact.id) ?? [];
    if (covering.length === 0) {
      out.push(
        violation(
          `${PENDING_DIR}/`,
          'css-fact-without-step',
          `${fact.id}: ${describeCssFact(fact)}`,
          { fact: fact.id },
        ),
      );
    } else if (factImpact(fact) === 'breaking' && !covering.some(stepIsBreaking)) {
      out.push(
        violation(
          `${PENDING_DIR}/`,
          'css-step-not-breaking',
          `${fact.id} takes away something a consumer may use, but ${covering.map((s) => s.id).join(', ')} ${covering.length === 1 ? 'is' : 'are'} not breaking: make the step kind removed (or renamed) with impact breaking.`,
          { fact: fact.id },
        ),
      );
    }
  }
  const known = new Set(facts.map((fact) => fact.id));
  for (const note of state.notes) {
    for (const step of noteSteps(note)) {
      const ids = (Array.isArray(step.facts) ? step.facts : []).filter(
        (id) => typeof id === 'string' && isCssFactId(id) && !known.has(id),
      );
      if (ids.length === 0) continue;
      out.push(
        violation(
          note.file,
          'step-fact-unknown',
          `${note.file}: step ${step.id} lists ${ids.join(', ')}, which the built CSS no longer shows since ${state.previousVersion} (the change was reverted, or the build is old: run ${BUILD}), so pnpm changeset:version would refuse this note. Take ${ids.length === 1 ? 'it' : 'them'} out of facts.`,
          { facts: ids },
        ),
      );
    }
  }
  return { out, facts };
}

/**
 * Rule 4's bump: a breaking CSS fact a step covers needs a minor below 1.0, a
 * major from 1.0. (An uncovered one is reported as without a step first.)
 */
function bumpViolations(state, facts) {
  const listed = new Set(state.notes.flatMap(noteSteps).flatMap((step) => step.facts ?? []));
  const breaking = facts
    .filter((fact) => factImpact(fact) === 'breaking' && listed.has(fact.id))
    .map((f) => f.id);
  if (breaking.length === 0) return [];
  const { version, previousVersion, changesets } = state;
  const named = `${breaking.slice(0, 3).join(', ')}${breaking.length > 3 ? ` and ${breaking.length - 3} more` : ''}`;
  if (changesets.length === 0 && compareVersions(version, previousVersion) > 0) {
    const actual = bumpBetween(previousVersion, version);
    const need = breakingBump(previousVersion);
    return BUMP_RANK[actual] < BUMP_RANK[need]
      ? [
          violation(
            'package.json',
            'bump-too-small',
            `${version} is a ${actual} release after ${previousVersion}, but ${named} ${breaking.length === 1 ? 'is' : 'are'} breaking: it needs a ${need} bump.`,
          ),
        ]
      : [];
  }
  const need = breakingBump(version);
  const bump = changesets.reduce(
    (max, c) => (BUMP_RANK[c.bump] > BUMP_RANK[max] ? c.bump : max),
    'none',
  );
  if (BUMP_RANK[bump] >= BUMP_RANK[need]) return [];
  const fix =
    changesets.length > 0
      ? `make one of ${changesets.map((c) => c.file).join(', ')} '${PACKAGE}': ${need}`
      : `add a changeset with pnpm changeset (${need}), then run ${NOTE}`;
  return [
    violation(
      changesets[0]?.file ?? '.changeset/',
      'bump-too-small',
      `${named} ${breaking.length === 1 ? 'is' : 'are'} breaking, so the next release needs a ${need} bump below 1.0 (a major from 1.0): ${fix}.`,
    ),
  ];
}

/**
 * Every problem with the built CSS of the tree at `root`, in the gate-output
 * shape, plus a summary (the utilities that left, for information).
 * @param {string} [root]
 */
export function checkUpgradeCss(root = REPO) {
  const fail = (v) => ({ violations: [v], ok: false, summary: null });
  const contract = readCssContract(root);
  if (!contract) {
    return fail(
      violation(
        CONTRACT_FILE,
        'no-built-css',
        `${CONTRACT_FILE} is missing: run ${BUILD} (it writes the contract after the stylesheets; pnpm smoke:consumer builds first).`,
      ),
    );
  }
  const rebuilt = buildCssContract(root);
  if (!rebuilt || formatContract(rebuilt) !== formatContract(contract)) {
    return fail(
      violation(
        CONTRACT_FILE,
        'contract-stale',
        `${CONTRACT_FILE} is not the contract of the stylesheets in dist/: run ${BUILD} so both come from one build.`,
      ),
    );
  }
  const state = readUpgradeState(root, { css: contract });
  if (!state.previousVersion) {
    return fail(
      violation(
        `${RELEASES_SNAPSHOTS}/`,
        'no-release-snapshot',
        `no release snapshot at or below ${state.version} in ${RELEASES_SNAPSHOTS}/: record the last release with node scripts/upgrade/snapshot.mjs --from-npm <version>.`,
      ),
    );
  }
  if (!state.previousCss) {
    return fail(
      violation(
        `${RELEASES_SNAPSHOTS}/${state.previousVersion}.json`,
        'no-css-baseline',
        `${RELEASES_SNAPSHOTS}/${state.previousVersion}.json has no css section, so there is nothing to compare the built CSS with: run node scripts/upgrade/snapshot.mjs --from-npm ${state.previousVersion} to record it from the tarball.`,
      ),
    );
  }
  const { out, facts } = factViolations(state);
  const violations = [
    ...out,
    ...bumpViolations(state, facts),
    ...reusedNames(root, state, contract),
  ];
  return {
    violations,
    ok: violations.length === 0,
    summary: {
      previous: state.previousVersion,
      facts: facts.filter((fact) => fact.kind !== 'utility-removed').length,
      utilitiesRemoved: facts.filter((f) => f.kind === 'utility-removed').map((f) => f.name),
    },
  };
}

function parseRoot(argv) {
  const at = argv.indexOf('--root');
  return at === -1 ? REPO : resolve(argv[at + 1] ?? '.');
}

function main(argv) {
  const json = hasJsonFlag(argv);
  const result = checkUpgradeCss(parseRoot(argv));
  emitResult(result, json);
  if (!result.ok) {
    console.error(`✗ check-upgrade-css — ${result.violations.length} problem(s):`);
    for (const v of result.violations) console.error(`  - ${v.message}`);
    console.error(
      `  fix: ${NOTE} [--name <changeset>] adds a step for each CSS fact (run ${BUILD} first, so it reads this build); replace its TODO plain lines, and make the changeset minor when something is removed (upgrade/README.md).`,
    );
    return 1;
  }
  if (!json) {
    const { previous, facts, utilitiesRemoved } = result.summary;
    const utilities =
      utilitiesRemoved.length > 0
        ? `; ${utilitiesRemoved.length} Tailwind utilit${utilitiesRemoved.length === 1 ? 'y' : 'ies'} left, for information: ${utilitiesRemoved.slice(0, 10).join(', ')}${utilitiesRemoved.length > 10 ? ', ...' : ''}`
        : '';
    console.log(
      `✓ check-upgrade-css — every CSS change since ${previous} has its upgrade step (${facts} fact(s))${utilities}.`,
    );
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`✗ check-upgrade-css — ${error?.message ?? error}`);
    process.exitCode = 2;
  }
}
