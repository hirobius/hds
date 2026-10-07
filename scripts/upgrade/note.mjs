#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * note.mjs — `pnpm upgrade:note`: pre-fill a changeset's upgrade note from the
 * facts the upgrade gate finds (hds#448).
 *
 *   pnpm upgrade:note [--name <changeset>] [--root <dir>]
 *
 * Writes upgrade/pending/<changeset>.json (shape: PendingNote in
 * ./schema.mjs) with one step for each fact since the last release that no
 * note covers yet: a name that left several entries is one step, so is each
 * exports key, dependency, peer, engine and bin. Each step gets its facts,
 * what to detect in consumer code (the imports, the package, the subpath) and
 * an impact guessed from the fact (./ledger.mjs factImpact). The note's
 * impact is the most severe of its steps, additive when the change only adds,
 * none when the diff sees nothing. An addition (an export, exports key,
 * dependency or bin) needs no step, so nothing ties it to a changeset: it
 * makes the guess additive only when this is the one pending changeset and no
 * other note lists it, never from another changeset's additions.
 *
 * Every plain line it writes is a TODO the gate refuses, because only a person
 * can say what a consumer should do. With impact none and nothing to tell,
 * delete the plain line instead.
 *
 * An existing note keeps what its author wrote: only steps for facts still
 * uncovered are added (and its impact raised if they are more severe), so a
 * second run changes nothing. Without --name it picks the one changeset that
 * has no note yet.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatJson } from './format.mjs';
import { BUMP_RANK, breakingBump, factImpact, uncoveredFacts } from './ledger.mjs';
import { PENDING_DIR, newFacts, noteSteps, readUpgradeState } from './pending.mjs';
import { IMPACTS, TODO_PLAIN } from './schema.mjs';
import { PACKAGE } from './snapshot.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** A problem with how the command was called: exit 2, nothing written. */
class UsageError extends Error {}

const specifier = (entry) => (entry === '.' ? PACKAGE : `${PACKAGE}/${entry.slice(2)}`);
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const moreSevere = (a, b) => (IMPACTS.indexOf(a) >= IMPACTS.indexOf(b) ? a : b);

/** The step a fact asks for, before its plain line: id, kind, impact and how to detect it. */
function draftFor(fact) {
  const impact = factImpact(fact);
  const imports = (entry) => ({ imports: [{ from: specifier(entry), names: [fact.name] }] });
  switch (fact.kind) {
    case 'removed':
      return { id: `removed/${fact.name}`, impact, detect: imports(fact.entry) };
    case 'moved':
      return { id: `moved/${fact.name}`, impact, detect: imports(fact.from) };
    case 'exports-key-removed':
      return {
        id: `exports/${fact.key}`,
        impact,
        detect: { regex: [`${escapeRegExp(specifier(fact.key))}['"]`] },
      };
    case 'dependency-removed':
      return {
        id: `dependency/${fact.name}`,
        impact,
        detect: { bareImports: [fact.name] },
        range: fact.range,
      };
    case 'peer-changed':
      return {
        id: `peer/${fact.name}`,
        impact,
        detect: { bareImports: [fact.name] },
        ...(fact.from ? { range: fact.from.range } : {}),
      };
    case 'engines-changed':
      return { id: `engines/${fact.name}`, impact };
    case 'bin-removed':
      return {
        id: `removed/${fact.name}`,
        impact,
        detect: { regex: [`\\b${escapeRegExp(fact.name)}\\b`] },
      };
    default:
      throw new Error(`no step for a ${fact.kind} fact`);
  }
}

/** One step per subject, in fact order; a name that left two entries is one step. */
export function stepsForFacts(facts) {
  const steps = new Map();
  for (const fact of facts) {
    const draft = draftFor(fact);
    const step = steps.get(draft.id);
    if (step) {
      step.facts.push(fact.id);
      for (const use of draft.detect?.imports ?? []) step.detect.imports.push(use);
      step.impact = moreSevere(step.impact, draft.impact);
      continue;
    }
    // Schema field order: id, kind, impact, plain, detect, range, facts.
    steps.set(draft.id, {
      id: draft.id,
      kind: draft.id.split('/')[0],
      impact: draft.impact,
      plain: TODO_PLAIN,
      ...(draft.detect ? { detect: draft.detect } : {}),
      ...(draft.range ? { range: draft.range } : {}),
      facts: [fact.id],
    });
  }
  return [...steps.values()];
}

/**
 * The additions `target`'s note can claim: none while another changeset is
 * pending, since the diff cannot say whose an addition is, and none that
 * another note already lists.
 */
function ownAdditions(state, target, facts) {
  if (state.changesets.some((c) => c.name !== target)) return [];
  const elsewhere = new Set(
    state.notes
      .filter((n) => n.name !== target)
      .flatMap(noteSteps)
      .flatMap((step) => step.facts ?? []),
  );
  return facts.filter((fact) => factImpact(fact) === 'additive' && !elsewhere.has(fact.id));
}

/** The changeset name to write a note for. */
function pickName(state, name) {
  if (name) return basename(name).replace(/\.(md|json)$/, '');
  const { changesets, notes } = state;
  if (changesets.length === 0) {
    throw new UsageError(
      'no .changeset/*.md is pending: run pnpm changeset first (minor for a breaking change below 1.0), then pnpm upgrade:note.',
    );
  }
  const noted = new Set(notes.map((n) => n.name));
  const without = changesets.filter((c) => !noted.has(c.name)).map((c) => c.name);
  if (without.length === 1) return without[0];
  if (without.length === 0 && changesets.length === 1) return changesets[0].name;
  const names = (without.length > 0 ? without : changesets.map((c) => c.name)).join(', ');
  throw new UsageError(
    without.length > 0
      ? `pass --name: ${names} have no upgrade note yet.`
      : `every changeset has a note: pass --name to add the uncovered facts to one of ${names}.`,
  );
}

/**
 * Write or extend upgrade/pending/<name>.json in the tree at `root`.
 * @param {string} root
 * @param {{ name?: string }} [options]
 * @returns {{ name: string, file: string, note: object, added: string[], written: boolean,
 *   changeset: { bump: string } | null, needBump: string }}
 */
export function writeNote(root, { name } = {}) {
  const state = readUpgradeState(root);
  const target = pickName(state, name);
  const file = `${PENDING_DIR}/${target}.json`;
  const existing = state.notes.find((n) => n.name === target);
  if (existing && existing.raw === null) {
    throw new UsageError(
      `${file} is not JSON: fix or delete it, then run pnpm upgrade:note again.`,
    );
  }
  const base = existing?.raw ?? null;

  const facts = newFacts(state);
  const uncovered = uncoveredFacts(facts, state.notes.flatMap(noteSteps));
  const steps = Array.isArray(base?.steps) ? base.steps.map((s) => ({ ...s })) : [];
  const added = [];
  for (const step of stepsForFacts(uncovered)) {
    const same = steps.find((s) => s.id === step.id);
    if (same) {
      same.facts = [...new Set([...(same.facts ?? []), ...step.facts])];
    } else {
      steps.push(step);
    }
    added.push(step.id);
  }

  const additive = ownAdditions(state, target, facts).length > 0 ? 'additive' : 'none';
  const known = IMPACTS.includes(base?.impact) ? base.impact : 'none';
  const impact = [additive, ...steps.map((s) => s.impact)]
    .filter((i) => IMPACTS.includes(i))
    .reduce(moreSevere, known);
  const plain = base?.plain ?? (base && impact === 'none' ? undefined : TODO_PLAIN);
  const { impact: _impact, plain: _plain, steps: _steps, ...rest } = base ?? {};
  const note = {
    impact,
    ...(plain !== undefined ? { plain } : {}),
    ...(steps.length > 0 ? { steps } : {}),
    ...rest,
  };

  const changed = !base || added.length > 0 || impact !== base.impact || plain !== base.plain;
  if (changed) {
    mkdirSync(join(root, PENDING_DIR), { recursive: true });
    writeFileSync(join(root, file), formatJson(note));
  }
  const changeset = state.changesets.find((c) => c.name === target) ?? null;
  return {
    name: target,
    file,
    note,
    added,
    written: changed,
    changeset,
    needBump: breakingBump(state.version),
  };
}

function parseArgs(argv) {
  const args = { name: undefined, root: REPO };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--name' && argv[i + 1]) args.name = argv[++i];
    else if (argv[i] === '--root' && argv[i + 1]) args.root = resolve(argv[++i]);
    else throw new UsageError(`unknown argument: ${argv[i]}`);
  }
  return args;
}

function main(argv) {
  const USAGE = 'usage: pnpm upgrade:note [--name <changeset>] [--root <dir>]';
  let result;
  try {
    const { root, name } = parseArgs(argv);
    result = writeNote(root, { name });
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`upgrade:note: ${error.message}\n${USAGE}`);
    return 2;
  }
  const { file, note, added, written, changeset, needBump, name } = result;
  if (!written) {
    console.log(`upgrade:note — ${file} already covers every fact; nothing to add.`);
  } else {
    const what = added.length > 0 ? `added ${added.join(', ')}` : 'no fact needs a step';
    console.log(`upgrade:note — wrote ${file}: ${what}; impact ${note.impact}.`);
  }
  if (JSON.stringify(note).includes(TODO_PLAIN)) {
    console.log(
      '  next: replace each TODO plain line with one sentence a consumer can act on (pnpm test fails until you do); with impact none and nothing to tell, delete the plain line.',
    );
  }
  if (!changeset) {
    console.log(
      `  no .changeset/${name}.md: the note travels with the changeset of the same name.`,
    );
  } else if (note.impact === 'breaking' && BUMP_RANK[changeset.bump] < BUMP_RANK[needBump]) {
    console.log(
      `  this note is breaking, but .changeset/${name}.md bumps by ${changeset.bump}: make it '${PACKAGE}': ${needBump}.`,
    );
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
