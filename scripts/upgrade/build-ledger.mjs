#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * build-ledger.mjs — builds upgrade/releases/<version>.json from inputs frozen
 * with that release, so no later edit elsewhere in the repo can rewrite a
 * shipped ledger: for a release that shipped before its ledger was written
 * (`backfilled`, hds#447, hds#450, hds#448), and for each release the release
 * compiler records at `changeset version` time (./compile.mjs --release,
 * hds#451), which freezes the inputs and then builds through
 * ledgerFromSources.
 *
 * Inputs, all committed and never edited once the ledger ships:
 *
 *   - docs/api/releases/<previous>.json and <version>.json: the snapshots of
 *     the two published tarballs (./snapshot.mjs --from-npm), whose facts
 *     (./diff.mjs) every non-additive change must land in a step.
 *   - upgrade/sources/<version>/release.json:
 *       version, previous, date, summary, backfilled: the release fields.
 *       names: how an export name that left an entry is classified, by rule
 *         (moved, renamed, folded, removed). Each rule has a plain-sentence
 *         template ({name}; {to} is the rename or the survivor), the codemod
 *         that applies it (`auto`: one bin, or a map of name to bin) and the
 *         frozen data file it reads (`data`).
 *       steps: what the diff cannot see (look, behavior, deprecated, ...),
 *         each with a `subject` (the id is <version>/<kind>/<subject>). A step
 *         citing CHANGELOG.md:<line>, numbered as the file read when the
 *         release shipped (./ledger.mjs changelogSource), carries the `needle`
 *         text that finds the line, and is marked backfilled. `each` repeats a
 *         step per name ({name}; an object map also fills {to}).
 *       notes: for a release whose changesets carried upgrade notes (hds#448)
 *         but that shipped before the compiler (hds#451), each changeset's
 *         name with the CHANGELOG line of its entry (`source`, and the
 *         `needle` that finds it). The notes themselves, upgrade/pending/
 *         <changeset>.json as `changeset version` left them, are frozen at
 *         notes/<changeset>.json and must fit PendingNote. Each note step
 *         becomes a release step field for field, its id prefixed with the
 *         version and its source the note's citation unless it names its
 *         own. A note with no steps whose impact is look, behavior or
 *         breaking becomes one step from its plain line (noteSteps). They
 *         were written before the release, so they are not marked
 *         backfilled. The facts they list are theirs: no name rule
 *         classifies them.
 *   - the data files the rules name, such as 0.20.0's removed.json and
 *     renames.json: codemods/removed-0.20.json and the RENAMES map of
 *     codemods/hds-prefix.mjs as 0.20.0 published them. The live files keep
 *     serving the codemods and may change; these copies do not.
 *
 * The build reads nothing else (not the live CHANGELOG; a test checks that
 * each needle still finds its cited line). A removed name no rule classifies,
 * a fact no step lists, a step listing a fact the diff lacks, a step or note
 * the schema rejects, or a frozen note release.json does not cite stops it.
 * The frozen sources cover 0.17.0 through 0.21.0: 0.17.0 to 0.20.0 from their
 * CHANGELOG sections and codemod data, 0.21.0 from its seven changesets'
 * upgrade notes. Later releases get theirs frozen and built by
 * ./compile.mjs --release at `changeset version` time (hds#451).
 *
 *   node scripts/upgrade/build-ledger.mjs [<version>...]           # write (default: every release with sources)
 *   node scripts/upgrade/build-ledger.mjs --check [<version>...]   # exit 1 if a committed ledger is stale
 *     --repo <dir>   read and write under another checkout (tests)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffSnapshots } from './diff.mjs';
import { formatJson } from './format.mjs';
import { assembleRelease, uncoveredFacts } from './ledger.mjs';
import { PendingNote, compareVersions } from './schema.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PACKAGE = '@hirobius/design-system';
const CHANGELOG_CITE = /^CHANGELOG\.md:\d+$/;

const sourcesDir = (repo, version) => join(repo, 'upgrade/sources', version);
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const specifier = (entry) => (entry === '.' ? PACKAGE : `${PACKAGE}/${entry.slice(2)}`);

/** The releases with frozen sources (upgrade/sources/<version>/release.json), oldest first. */
export function sourceVersions({ repo = REPO } = {}) {
  const dir = join(repo, 'upgrade/sources');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((version) => existsSync(join(dir, version, 'release.json')))
    .sort(compareVersions);
}

/** A frozen upgrade note, validated: it must be what the gate accepted. */
function readNote(dir, rel) {
  const file = join(dir, rel);
  if (!existsSync(file)) throw new Error(`${rel} is cited in release.json but missing`);
  const result = PendingNote.safeParse(readJson(file));
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`${rel} does not fit PendingNote: ${problems.join('; ')}`);
  }
  return result.data;
}

/**
 * A release's frozen inputs: release.json, every data file its rules name and
 * every upgrade note it cites (notes/<changeset>.json).
 * @returns {{ release: any, data: Record<string, any>, notes: Record<string, any> }}
 */
export function readSources(version, { repo = REPO } = {}) {
  const dir = sourcesDir(repo, version);
  const where = `upgrade/sources/${version}`;
  const release = readJson(join(dir, 'release.json'));
  if (release.version !== version) {
    throw new Error(`${where}/release.json holds version ${release.version}`);
  }
  const data = {};
  for (const rule of Object.values(release.names ?? {})) {
    if (rule.data && !(rule.data in data)) data[rule.data] = readJson(join(dir, rule.data));
  }
  const cited = Object.keys(release.notes ?? {});
  const frozen = existsSync(join(dir, 'notes'))
    ? readdirSync(join(dir, 'notes')).filter((file) => file.endsWith('.json'))
    : [];
  for (const file of frozen) {
    if (!cited.includes(file.replace(/\.json$/, ''))) {
      throw new Error(`${where}/notes/${file} is not cited in release.json notes`);
    }
  }
  const notes = Object.fromEntries(
    cited.map((name) => [name, readNote(repo, `${where}/notes/${name}.json`)]),
  );
  return { release, data, notes };
}

/** `{name}` and `{to}` filled in a template string. */
function fill(template, vars, where) {
  return template.replace(/\{(name|to)\}/g, (_, key) => {
    if (vars[key] === undefined) throw new Error(`${where}: {${key}} has no value`);
    return vars[key];
  });
}

const autoFor = (rule, name) => {
  const codemod = typeof rule.auto === 'string' ? rule.auto : rule.auto?.[name];
  return codemod ? { auto: { codemod, args: [] } } : {};
};

/** One step per export name that left an entry, classified by the release's `names` rules. */
function nameSteps({ release, data, facts, next }) {
  const { version } = release;
  const rules = release.names ?? {};
  const renames = rules.renamed ? data[rules.renamed.data].renames : {};
  const survivors = new Map(
    Object.values((rules.folded && data[rules.folded.data].replaced) ?? {}).flatMap(Object.entries),
  );
  const modules = (rules.removed && data[rules.removed.data].modules) ?? {};
  const noSurvivor = new Set(Object.values(modules).flat());
  // A name whose module the root still exports from went private (a *Variants helper).
  const rootModules = new Set(Object.values(next.entries['.'] ?? {}));
  const wentPrivate = new Set(
    Object.entries(modules)
      .filter(([file]) => rootModules.has(file.replace(/\.tsx?$/, '')))
      .flatMap(([, names]) => names),
  );

  const byName = new Map();
  for (const fact of facts) {
    if (fact.kind !== 'removed' && fact.kind !== 'moved') continue;
    if (!byName.has(fact.name)) byName.set(fact.name, []);
    byName.get(fact.name).push(fact);
  }

  const steps = [];
  for (const [name, left] of byName) {
    const from = left.map((fact) => (fact.kind === 'moved' ? fact.from : fact.entry));
    const step = (kind, rule, vars, source, plain = rule.plain) =>
      steps.push({
        id: `${version}/${kind}/${name}`,
        kind,
        impact: 'breaking',
        plain: fill(plain, { name, ...vars }, `names.${kind}`),
        ...autoFor(rule, name),
        detect: { imports: from.map((entry) => ({ from: specifier(entry), names: [name] })) },
        facts: left.map((fact) => fact.id),
        source,
      });

    const moved = rules.moved;
    if (
      moved &&
      left.every(
        (fact) => fact.kind === 'moved' && fact.from === moved.from && fact.to === moved.to,
      )
    ) {
      step(
        'moved',
        moved,
        { to: specifier(moved.to) },
        `snapshot diff ${release.previous}..${version}`,
      );
    } else if (rules.renamed && Object.hasOwn(renames, name)) {
      step('renamed', rules.renamed, { to: renames[name] }, rules.renamed.source);
    } else if (rules.folded && survivors.has(name)) {
      step('folded', rules.folded, { to: survivors.get(name) }, rules.folded.source);
    } else if (rules.removed && noSurvivor.has(name)) {
      const plain = wentPrivate.has(name) ? rules.removed.privatePlain : rules.removed.plain;
      step('removed', rules.removed, {}, rules.removed.source, plain);
    } else {
      throw new Error(
        `${name} left ${from.join(', ')} in ${version}, but no rule in upgrade/sources/${version} classifies it`,
      );
    }
  }
  return steps;
}

/** One step per runtime dependency the release stopped installing. */
function dependencySteps({ release, facts }) {
  return facts
    .filter((fact) => fact.kind === 'dependency-removed')
    .map((fact) => ({
      id: `${release.version}/dependency/${fact.name}`,
      kind: 'dependency',
      impact: 'breaking',
      plain: `HDS no longer installs ${fact.name}, so add it to your own dependencies if your code imports it.`,
      range: fact.range,
      detect: { bareImports: [fact.name] },
      facts: [fact.id],
      source: `snapshot diff ${release.previous}..${release.version}`,
    }));
}

/** `step` once, or once per name of its `each`, with {name} and {to} filled in. */
function expand(step) {
  const { each, ...template } = step;
  if (!each) return [template];
  const pairs = Array.isArray(each) ? each.map((name) => [name, undefined]) : Object.entries(each);
  const where = `${template.kind}/${template.subject}`;
  return pairs.map(([name, to]) =>
    JSON.parse(JSON.stringify(template), (_, value) =>
      typeof value === 'string' ? fill(value, { name, to }, where) : value,
    ),
  );
}

/** The release's hand-written steps; a CHANGELOG citation must carry its needle. */
function handSteps(release) {
  return (release.steps ?? []).flatMap((entry) => {
    const cites = CHANGELOG_CITE.test(entry.source ?? '');
    if (cites && !entry.needle) {
      throw new Error(
        `${release.version} step ${entry.kind}/${entry.subject} cites ${entry.source} with no needle`,
      );
    }
    return expand(entry).map(({ subject, needle: _needle, ...step }) => ({
      id: `${release.version}/${step.kind}/${subject}`,
      ...step,
      ...(cites && release.backfilled ? { backfilled: true } : {}),
    }));
  });
}

/**
 * The step kind that records a stepless note's plain line, by its impact: no
 * kind says breaking, so a breaking change with no step is a manual one.
 */
const PLAIN_LINE_KIND = { look: 'look', behavior: 'behavior', breaking: 'manual' };

/**
 * The steps of the release's frozen upgrade notes: each note step with the
 * version on its id and, unless it names its own, its changeset's CHANGELOG
 * entry as its source. A note with no steps whose impact is look, behavior
 * or breaking is the change its plain line tells, so that line becomes one
 * step, <version>/<kind>/<changeset> (PLAIN_LINE_KIND), rather than dropping
 * out of the ledger; a none or additive note asks nothing of a consumer. A
 * CHANGELOG citation must carry its needle.
 */
function noteSteps(release, notes) {
  return Object.entries(release.notes ?? {}).flatMap(([name, cite]) => {
    if (CHANGELOG_CITE.test(cite.source ?? '') && !cite.needle) {
      throw new Error(`${release.version} note ${name} cites ${cite.source} with no needle`);
    }
    if (!cite.source) throw new Error(`${release.version} note ${name} has no source`);
    const note = notes[name];
    const kind = PLAIN_LINE_KIND[note.impact];
    if (!note.steps && kind) {
      return [
        {
          id: `${release.version}/${kind}/${name}`,
          kind,
          impact: note.impact,
          plain: note.plain,
          source: cite.source,
        },
      ];
    }
    return (note.steps ?? []).map(({ id, source, ...step }) => ({
      id: `${release.version}/${id}`,
      ...step,
      source: source ?? cite.source,
    }));
  });
}

/**
 * The ledger of `version`, built from its two snapshots and its frozen sources.
 * Throws when a fact has no step or a step does not fit upgrade/schema.json.
 */
export function buildLedger(version, { repo = REPO } = {}) {
  const { release, data, notes } = readSources(version, { repo });
  const snapshot = (v) => readJson(join(repo, 'docs/api/releases', `${v}.json`));
  return ledgerFromSources({
    release,
    data,
    notes,
    previous: snapshot(release.previous),
    next: snapshot(version),
  });
}

/**
 * buildLedger on inputs already in memory: release.json, its data files and
 * notes (as readSources returns them) and the two snapshots. The release
 * compiler (./compile.mjs) builds a ledger this way before it writes any of
 * those inputs, so a fact no note covers stops it with nothing written.
 */
export function ledgerFromSources({ release, data = {}, notes = {}, previous, next }) {
  const { version } = release;
  const facts = diffSnapshots(previous, next);

  // Written steps (notes, then hand steps) own the facts they list; the rules
  // classify only what is left, so a note's removal is never classified twice.
  const written = [...noteSteps(release, notes), ...handSteps(release)];
  const listed = new Set(written.flatMap((step) => step.facts ?? []));
  const open = facts.filter((fact) => !listed.has(fact.id));

  const ledger = assembleRelease({
    version,
    previous: release.previous,
    date: release.date,
    summary: release.summary,
    backfilled: release.backfilled,
    steps: [
      ...nameSteps({ release, data, facts: open, next }),
      ...dependencySteps({ release, facts: open }),
      ...written,
    ],
  });

  const missed = uncoveredFacts(facts, ledger.steps, { version });
  if (missed.length > 0) {
    throw new Error(
      `${version}: facts with no step: ${missed.map((fact) => fact.id).join(', ')}; add a step that lists each in upgrade/sources/${version}/release.json`,
    );
  }
  const known = new Set(facts.map((fact) => fact.id));
  for (const step of ledger.steps) {
    const unknown = (step.facts ?? []).filter((id) => !known.has(id));
    if (unknown.length > 0) {
      throw new Error(
        `${step.id} lists ${unknown.join(', ')}, which the ${release.previous} -> ${version} diff does not have`,
      );
    }
  }
  return ledger;
}

const USAGE = 'usage: build-ledger.mjs [--check] [--repo <dir>] [<version>...]';

function main(argv) {
  let check = false;
  let repo = REPO;
  const versions = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') check = true;
    else if (arg === '--repo' && argv[i + 1]) repo = resolve(argv[++i]);
    else if (arg.startsWith('-')) {
      console.error(`build-ledger.mjs: unknown argument: ${arg}\n${USAGE}`);
      return 2;
    } else versions.push(arg);
  }
  const targets = versions.length > 0 ? versions : sourceVersions({ repo });
  if (targets.length === 0) {
    console.error(`build-ledger.mjs: no release has sources under upgrade/sources\n${USAGE}`);
    return 2;
  }

  let stale = 0;
  for (const version of targets) {
    const rel = `upgrade/releases/${version}.json`;
    const file = join(repo, rel);
    const text = formatJson(buildLedger(version, { repo }));
    if (!check) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
      console.log(`build-ledger.mjs: wrote ${rel}`);
    } else if (!existsSync(file) || readFileSync(file, 'utf8') !== text) {
      console.error(
        `build-ledger.mjs: ${rel} is stale; run node scripts/upgrade/build-ledger.mjs ${version}`,
      );
      stale++;
    }
  }
  if (check && stale === 0) console.log(`build-ledger.mjs: ${targets.join(', ')} current`);
  return stale > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`build-ledger.mjs: ${error?.message ?? error}`);
    process.exitCode = 2;
  }
}
