#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * schema.mjs — the shape of the upgrade ledger (hds#447), in zod, and the
 * generator of upgrade/schema.json from it.
 *
 * A release ledger (upgrade/releases/<version>.json) is the one
 * machine-readable record of what a release changed for a consumer: one step
 * per change, each with an impact, one plain sentence, the codemod that applies
 * it (if any) and how to find a use of it in consumer code. The upgrade command
 * (hds#452) applies and reports steps; the compiler (hds#451) turns them into
 * UPGRADING.md and upgrade/index.json; the gate (hds#448) fails a change that has
 * no step. This file is their contract, so all three read the same shape.
 *
 * Between releases, each changeset carries a pending note,
 * upgrade/pending/<changeset>.json (PendingNote): its impact, one plain line,
 * and the steps it adds, each a release step whose id leaves out the version
 * (`removed/Callout`). The compiler prefixes the version when it merges the
 * notes into the release's ledger.
 *
 * zod is the single source. upgrade/schema.json is generated from it for
 * editors and non-JavaScript readers; `--check` (in pretest) fails when the
 * committed file is not byte-equal to what this file generates.
 *
 *   node scripts/upgrade/schema.mjs            # write upgrade/schema.json
 *   node scripts/upgrade/schema.mjs --check    # exit 1 if it is stale
 *   node scripts/upgrade/schema.mjs --check <file>
 *   node scripts/upgrade/schema.mjs --json     # --check, as { violations, ok } (gate-output.mjs)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { emitResult, hasJsonFlag } from '../lib/gate-output.mjs';
import { formatJson, sortedObject } from './format.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SCHEMA_PATH = join(REPO, 'upgrade/schema.json');

export const STEP_KINDS = [
  'removed',
  'moved',
  'renamed',
  'folded',
  'deprecated',
  'value-changed',
  'look',
  'behavior',
  'dependency',
  'peer',
  'engines',
  'exports',
  'tenant',
  'manual',
];
export const IMPACTS = ['none', 'additive', 'look', 'behavior', 'breaking'];
export const BUMPS = ['patch', 'minor', 'major'];

const SEMVER = '\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?';

/** -1, 0 or 1. A pre-release sorts before its release (0.21.0-next.1 < 0.21.0). */
export function compareVersions(a, b) {
  const parse = (v) => {
    const [core, pre = null] = v.split(/-(.*)/s);
    return { nums: core.split('.').map(Number), pre };
  };
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < 3; i++) {
    if (x.nums[i] !== y.nums[i]) return x.nums[i] < y.nums[i] ? -1 : 1;
  }
  if (x.pre === y.pre) return 0;
  if (x.pre === null) return 1;
  if (y.pre === null) return -1;
  return x.pre < y.pre ? -1 : 1;
}

const version = () =>
  z
    .string()
    .regex(new RegExp(`^${SEMVER}$`))
    .describe('A semver version, such as 0.20.0.');

const date = () =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('The day the release was published to npm, YYYY-MM-DD.');

const names = (description) => z.array(z.string().min(1)).min(1).describe(description);

const compiles = (source) => {
  try {
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
};

const oneSentence = (text) => !/[.!?]["')\]]?\s+[A-Z]/.test(text);

/** What `pnpm upgrade:note` writes where a person has to: the gate refuses it. */
export const TODO_PLAIN = 'TODO: one sentence a consumer can act on, ending in a full stop.';
const notTodo = (text) => !/^\s*TODO\b/i.test(text);
const TODO_MESSAGE =
  'plain still holds the TODO pnpm upgrade:note wrote; replace it with one sentence a consumer can act on';

const plainLine = () =>
  z
    .string()
    .min(1)
    .max(300)
    .regex(/^[^\n]+[.]$/)
    .refine(oneSentence, 'plain is one sentence')
    .refine(notTodo, TODO_MESSAGE)
    .describe('One sentence a non-expert can act on, ending in a full stop.');

export const Auto = z
  .object({
    codemod: z
      .string()
      .regex(/^[a-z][a-z0-9-]*$/)
      .describe(
        'The name of a bin this package ships (package.json#bin), such as hds-patterns-subpath.',
      ),
    args: z
      .array(z.string())
      .describe(
        'Extra arguments. The upgrade command passes --root, --dry-run and --check itself.',
      ),
  })
  .strict()
  .describe('The codemod that applies this step for the consumer.');

export const Detect = z
  .object({
    imports: z
      .array(
        z
          .object({
            from: z
              .string()
              .min(1)
              .describe(
                'The module specifier as written in the import: @hirobius/design-system or one of its subpaths.',
              ),
            names: names('Export names. A named import of any of them from `from` is a use.'),
          })
          .strict(),
      )
      .min(1)
      .optional()
      .describe('Named imports (and re-exports) that use the changed thing.'),
    jsx: names(
      'JSX tag names, as exported (Card, Card.Header). The tool resolves a local alias.',
    ).optional(),
    cssVars: z
      .array(z.string().regex(/^--[\w-]+$/))
      .min(1)
      .optional()
      .describe('Custom properties read with var(--name), in CSS or in code.'),
    cssVarWrites: z
      .array(z.string().regex(/^--[\w-]+$/))
      .min(1)
      .optional()
      .describe('Custom properties the consumer sets (--name: value), overriding HDS.'),
    classes: z
      .array(z.string().regex(/^\S+$/))
      .min(1)
      .optional()
      .describe('Class names, in className strings or CSS selectors.'),
    bareImports: z
      .array(z.string().regex(/^(?:@[^\s/]+\/)?[^\s/@][^\s]*$/))
      .min(1)
      .optional()
      .describe(
        'Package specifiers the consumer imports or requires directly, such as a dependency HDS stopped installing.',
      ),
    regex: z
      .array(z.string().min(1).refine(compiles, 'not a valid JavaScript regular expression'))
      .min(1)
      .optional()
      .describe('JavaScript regular expression sources, each tested against a whole file.'),
  })
  .strict()
  .refine((detect) => Object.keys(detect).length > 0, 'detect needs at least one key')
  .meta({ minProperties: 1 })
  .describe('How to find a use of the changed thing in consumer code. Any match is a use.');

/** The fields a release step and a pending step share, in schema order. */
const stepFields = () => ({
  kind: z.enum(STEP_KINDS).describe('What changed.'),
  impact: z
    .enum(IMPACTS)
    .describe(
      'What happens to a consumer that does nothing: none, additive (new, opt-in), look, behavior, or breaking (it stops compiling or running).',
    ),
  plain: plainLine(),
  auto: Auto.optional(),
  detect: Detect.optional(),
  removeIn: version().optional().describe('For a deprecation: the version that removes it.'),
  range: z
    .string()
    .min(1)
    .optional()
    .describe(
      'For a dependency or peer step: the range this package declared before the release, so a consumer that still imports it can add it back.',
    ),
  facts: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe(
      'The ids of the snapshot-diff facts this step accounts for (scripts/upgrade/diff.mjs), such as removed:.:IconButton.',
    ),
});

const deprecationNamesRemoveIn = [
  (step) => step.kind !== 'deprecated' || step.removeIn !== undefined,
  {
    message: 'a deprecation names the version that removes it (removeIn)',
    path: ['removeIn'],
  },
];

export const Step = z
  .object({
    id: z
      .string()
      .regex(new RegExp(`^${SEMVER}/(?:${STEP_KINDS.join('|')})/\\S+$`))
      .describe(
        'Stable id, <version>/<kind>/<subject>: the subject is the export, package, component or variable the step is about.',
      ),
    ...stepFields(),
    backfilled: z
      .boolean()
      .optional()
      .describe('True when the step was written from CHANGELOG prose after the release shipped.'),
    source: z
      .string()
      .min(1)
      .describe(
        'Where the step comes from: CHANGELOG.md:<line> (as of the release), a codemod data file, or the snapshot diff.',
      ),
  })
  .strict()
  .refine((step) => step.id.split('/')[1] === step.kind, {
    message: 'the id names a different kind than `kind`',
    path: ['id'],
  })
  .refine(...deprecationNamesRemoveIn)
  .describe('One thing a consumer may have to do, or should know, when crossing this release.');

export const Release = z
  .object({
    version: version(),
    date: date(),
    bump: z.enum(BUMPS).describe('The semver bump from the previous release.'),
    summary: z
      .string()
      .min(1)
      .max(140)
      .describe('The release in one line, 140 characters at most.'),
    backfilled: z
      .boolean()
      .describe(
        'True when this ledger was written after the release shipped, from its tarball and CHANGELOG.',
      ),
    steps: z.array(Step),
  })
  .strict()
  .superRefine((release, ctx) => {
    const seen = new Set();
    release.steps.forEach((step, i) => {
      if (!step.id.startsWith(`${release.version}/`)) {
        ctx.addIssue({
          code: 'custom',
          message: `step ${step.id} is not in ${release.version}`,
          path: ['steps', i, 'id'],
        });
      }
      if (seen.has(step.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `two steps share the id ${step.id}`,
          path: ['steps', i, 'id'],
        });
      }
      seen.add(step.id);
      if (step.removeIn && compareVersions(step.removeIn, release.version) <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: `removeIn ${step.removeIn} is not after ${release.version}`,
          path: ['steps', i, 'removeIn'],
        });
      }
    });
  })
  .describe(
    'A release ledger, upgrade/releases/<version>.json: every step a consumer crosses with this release.',
  );

/** IMPACTS from least to most severe: a note is at least as severe as each of its steps. */
const severity = (impact) => IMPACTS.indexOf(impact);

export const PendingStep = z
  .object({
    id: z
      .string()
      .regex(new RegExp(`^(?:${STEP_KINDS.join('|')})/\\S+$`))
      .describe(
        '<kind>/<subject>, a release step id without its version: the compiler (hds#451) prefixes the version when it merges the note into upgrade/releases/<version>.json.',
      ),
    ...stepFields(),
    source: z
      .string()
      .min(1)
      .optional()
      .describe('Where the step comes from. When absent, the compiler (hds#451) fills it in.'),
  })
  .strict()
  .refine((step) => step.id.split('/')[0] === step.kind, {
    message: 'the id names a different kind than `kind`',
    path: ['id'],
  })
  .refine(...deprecationNamesRemoveIn)
  .describe('One step of a pending note: a release step whose id leaves out the version.');

export const PendingNote = z
  .object({
    impact: z
      .enum(IMPACTS)
      .describe(
        'The most severe impact of this change on a consumer that does nothing. A change with none says so: impact none, stated, never left out.',
      ),
    plain: plainLine()
      .optional()
      .describe(
        'The change in one sentence a non-expert can act on, ending in a full stop. Required unless impact is none.',
      ),
    steps: z
      .array(PendingStep)
      .min(1)
      .optional()
      .describe(
        'The ledger steps this change adds. A fact the snapshot diff finds (a removed export, a dropped dependency) needs a step that lists it in facts.',
      ),
  })
  .strict()
  .superRefine((note, ctx) => {
    if (note.impact !== 'none' && note.plain === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `impact is ${note.impact}, so plain is required: one sentence a consumer can act on`,
        path: ['plain'],
      });
    }
    const seen = new Set();
    (note.steps ?? []).forEach((step, i) => {
      if (severity(step.impact) > severity(note.impact)) {
        ctx.addIssue({
          code: 'custom',
          message: `step ${step.id} is ${step.impact}, so the note's impact is at least ${step.impact}`,
          path: ['impact'],
        });
      }
      if (seen.has(step.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `two steps share the id ${step.id}`,
          path: ['steps', i, 'id'],
        });
      }
      seen.add(step.id);
    });
  })
  .describe(
    'upgrade/pending/<changeset>.json: the upgrade note a changeset carries until its release (hds#448).',
  );

export const Index = z
  .object({
    package: z.literal('@hirobius/design-system'),
    latest: version().describe('The newest release with a ledger.'),
    floor: version().describe(
      'The oldest version the upgrade command can upgrade from. Below it, the command stops and changes nothing.',
    ),
    versions: z
      .array(
        z
          .object({
            version: version(),
            date: date(),
            bump: z.enum(BUMPS),
            breaking: z
              .number()
              .int()
              .nonnegative()
              .describe('How many of its steps have impact breaking.'),
            summary: z.string().min(1).max(140),
          })
          .strict(),
      )
      .describe('Every release with a ledger.'),
    deprecated: z
      .array(
        z
          .object({
            name: z.string().min(1).describe('The deprecated export.'),
            entry: z
              .string()
              .optional()
              .describe('The package.json#exports key that exports it, such as `.`.'),
            removeIn: version(),
            useInstead: z.string().min(1).optional(),
            step: z.string().min(1).describe('The id of the deprecated step that announced it.'),
          })
          .strict(),
      )
      .describe('Names deprecated today, with the release that removes them (Coming next).'),
  })
  .strict()
  .describe('upgrade/index.json: the releases the upgrade command knows, and its floor.');

export const Snapshot = z
  .object({
    format: z.literal(1),
    name: z.string().min(1),
    version: version(),
    entries: z
      .record(z.string(), z.record(z.string(), z.string()))
      .describe(
        'Every JS entry in package.json#exports: its export names, each with the module that declares it (relative to dist/types, no extension).',
      ),
    exportsKeys: z.array(z.string()).describe('Every package.json#exports key.'),
    dependencies: z.record(z.string(), z.string()),
    peerDependencies: z.record(
      z.string(),
      z.object({ range: z.string(), optional: z.boolean() }).strict(),
    ),
    engines: z.record(z.string(), z.string()),
    bin: z.record(z.string(), z.string()),
    files: z.array(z.string()).describe('package.json#files.'),
  })
  .strict()
  .describe(
    'docs/api/releases/<version>.json: the public surface of one published release (scripts/upgrade/snapshot.mjs).',
  );

/** upgrade/schema.json: a release ledger at the root; the other shapes in $defs. */
export function buildJsonSchema() {
  const registry = z.registry();
  registry.add(Auto, { id: 'auto' });
  registry.add(Detect, { id: 'detect' });
  registry.add(Step, { id: 'step' });
  registry.add(Release, { id: 'release' });
  registry.add(Index, { id: 'index' });
  registry.add(Snapshot, { id: 'snapshot' });
  registry.add(PendingStep, { id: 'pendingStep' });
  registry.add(PendingNote, { id: 'pendingNote' });
  const { schemas } = z.toJSONSchema(registry, { uri: (id) => `#/$defs/${id}` });
  const defs = sortedObject(schemas, ({ $schema: _schema, $id: _id, ...body }) => body);
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: '@hirobius/design-system upgrade ledger',
    description:
      "Generated from scripts/upgrade/schema.mjs; do not edit. The root validates a release ledger (upgrade/releases/<version>.json); $defs.index validates upgrade/index.json, $defs.snapshot a release snapshot (docs/api/releases/<version>.json) and $defs.pendingNote a changeset's upgrade note (upgrade/pending/<changeset>.json).",
    $ref: '#/$defs/release',
    $defs: defs,
  };
}

/**
 * Every problem with the ledgers in `dir`, as `<file>: <path>: <message>`.
 * @param {string} dir
 * @returns {string[]}
 */
export function checkReleaseDir(dir) {
  const problems = [];
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch (error) {
      problems.push(`${file}: not JSON (${error.message})`);
      continue;
    }
    const result = Release.safeParse(data);
    for (const issue of result.error?.issues ?? []) {
      problems.push(`${file}: ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    if (result.success && file !== `${data.version}.json`) {
      problems.push(
        `${file}: holds version ${data.version}, so it must be named ${data.version}.json`,
      );
    }
  }
  return problems;
}

function main(argv) {
  const json = hasJsonFlag(argv);
  const rest = argv.filter((arg) => arg !== '--json');
  const check = json || rest[0] === '--check';
  const args = rest[0] === '--check' ? rest.slice(1) : rest;
  if (args.length > (check ? 1 : 0) || args.some((arg) => arg.startsWith('--'))) {
    console.error('usage: schema.mjs [--check [<file>]] [--json]');
    return 2;
  }
  const file = args[0] ? resolve(args[0]) : SCHEMA_PATH;
  const text = formatJson(buildJsonSchema());
  if (!check) {
    writeFileSync(file, text);
    console.log(`schema.mjs: wrote ${file}`);
    return 0;
  }
  const stale = !existsSync(file) || readFileSync(file, 'utf8') !== text;
  const message = `${file} is not generated from scripts/upgrade/schema.mjs; run node scripts/upgrade/schema.mjs`;
  const violations = stale
    ? [
        {
          file: args[0] ? file : 'upgrade/schema.json',
          line: null,
          rule: 'schema-stale',
          severity: 'error',
          message,
        },
      ]
    : [];
  emitResult({ violations }, json);
  if (stale) console.error(`schema.mjs: ${message}`);
  else if (!json) console.log('schema.mjs: upgrade/schema.json is current');
  return stale ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
