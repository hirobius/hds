#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * compile.mjs — the release compiler (hds#451).
 *
 * The committed ledgers (upgrade/releases/<version>.json, shape in
 * ./schema.mjs) are the one record of what each release asks of a consumer.
 * This file turns them into what people and tools read, and records each new
 * release into them at `changeset version` time:
 *
 *   - UPGRADING.md: what the file knows (releases up to the installed
 *     version) and where newer steps come from, how to upgrade, then every
 *     release newest first, each with a one-line summary and four lists:
 *     Fixed for you, Looks different, Coming next, Do by hand (listOf below
 *     maps each step to exactly one; an empty list is left out). Steps whose
 *     sentences differ only in the name share a bullet (bulletsOf), and a
 *     deprecation a later release took away says which (removalTail);
 *   - upgrade/index.json: every release with its breaking count, the floor
 *     (./history.mjs) and what is deprecated today, with its removeIn;
 *   - status.json `release`: the newest release, for the fleet dashboard.
 *
 * Generated text never promises a command the package lacks: with a
 * `design-system` bin (the one command, hds#452) it leads with
 * `npx @hirobius/design-system@latest upgrade`; without it, with the manual
 * route (install the exact version, run the codemods, then Do by hand).
 *
 *   node scripts/upgrade/compile.mjs             # write the three from the ledgers
 *   node scripts/upgrade/compile.mjs --release   # record the release changeset version
 *                                                # just cut, then write the three
 *     --date YYYY-MM-DD   the release date (default: today, UTC)
 *   node scripts/upgrade/compile.mjs --check     # exit 1 if any of the three is stale
 *   node scripts/upgrade/compile.mjs --json      # --check, as { violations, ok } (gate-output.mjs)
 *     --repo <dir>        work on another checkout (tests)
 *
 * `--release` runs inside `pnpm changeset:version`, which the release
 * workflow runs to open the Version PR (recordRelease below says what it
 * writes). `--check` runs in pretest; it reads only committed files, needs no
 * network and no build, and never writes. The writers own the layout:
 * UPGRADING.md and upgrade/index.json are in .prettierignore, and the status
 * object holds scalars only, which Prettier and `pnpm status:fold` leave as
 * written.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitResult, hasJsonFlag } from '../lib/gate-output.mjs';
import { ledgerFromSources } from './build-ledger.mjs';
import { formatJson } from './format.mjs';
import { floor, releaseVersions } from './history.mjs';
import { diffSnapshots } from './diff.mjs';
import { changelogSource, uncoveredFacts } from './ledger.mjs';
import { IMPACTS, Index, Release, compareVersions } from './schema.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Not imported from ./snapshot.mjs: that loads TypeScript, which --check never needs.
const PACKAGE = '@hirobius/design-system';
const FIX = 'node scripts/upgrade/compile.mjs';

/** The one command (hds#452): npx runs the bin named after the package. */
export const ONE_COMMAND = `npx ${PACKAGE}@latest upgrade`;
export const ONE_COMMAND_BIN = 'design-system';
/** The release the one command is planned to ship in, named while the bin is absent. */
export const ONE_COMMAND_FROM = '0.22.0';
const UPGRADING_URL = 'https://github.com/hirobius/hds/blob/main/UPGRADING.md';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/**
 * What the generated files are compiled from: the committed ledgers, oldest
 * first, the floor (the oldest committed snapshot) and whether the package
 * ships the one command. Throws when a ledger does not fit the schema.
 */
function readHistory(repo) {
  const ledgersDir = join(repo, 'upgrade/releases');
  const ledgers = releaseVersions(ledgersDir).map((version) => {
    const result = Release.safeParse(readJson(join(ledgersDir, `${version}.json`)));
    if (!result.success) {
      const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      throw new Error(
        `upgrade/releases/${version}.json does not fit upgrade/schema.json: ${problems.join('; ')}. Rebuild it from upgrade/sources/${version} with node scripts/upgrade/build-ledger.mjs ${version}, then run ${FIX}.`,
      );
    }
    return result.data;
  });
  if (ledgers.length === 0) {
    throw new Error(
      `upgrade/releases holds no ledger: record a release first (upgrade/README.md, "Recording a release by hand"), then run ${FIX}.`,
    );
  }
  const pkg = readJson(join(repo, 'package.json'));
  const bin = typeof pkg.bin === 'object' && pkg.bin ? pkg.bin : {};
  return {
    ledgers,
    latest: ledgers.at(-1).version,
    floor: floor(join(repo, 'docs/api/releases')),
    bin,
    command: Object.hasOwn(bin, ONE_COMMAND_BIN),
  };
}

/** The four lists of UPGRADING.md, in the order a release section prints them. */
export const LISTS = ['fixedForYou', 'looksDifferent', 'comingNext', 'doByHand'];
const HEADINGS = {
  fixedForYou: 'Fixed for you',
  looksDifferent: 'Looks different',
  comingNext: 'Coming next',
  doByHand: 'Do by hand',
};

/** Step kinds that take something public away (./ledger.mjs stepIsBreaking reads the same four). */
const REMOVING = new Set(['removed', 'moved', 'renamed', 'folded']);

/**
 * The list a ledger step belongs to, from its kind, impact and auto alone
 * (its plain line is not read):
 *   - a deprecation (kind deprecated) is Coming next: it still works;
 *   - a step a codemod applies (auto) is Fixed for you;
 *   - a step with impact look that neither takes something away nor is a
 *     manual step is Looks different; its plain line may say how to keep the
 *     old look ("so pass fullPage where ..."), which is up to the consumer;
 *   - every other step is Do by hand: breaking and behavior changes (impact
 *     behavior may break a test or a flow even when the plain line names no
 *     edit), a removed or moved name with no codemod, a manual step, and an
 *     additive or none-impact step, which a note only records to tell the
 *     consumer something to do.
 * @returns {'fixedForYou' | 'looksDifferent' | 'comingNext' | 'doByHand'}
 */
export function listOf(step) {
  if (step.kind === 'deprecated') return 'comingNext';
  if (step.auto) return 'fixedForYou';
  if (step.impact === 'look' && !REMOVING.has(step.kind) && step.kind !== 'manual') {
    return 'looksDifferent';
  }
  return 'doByHand';
}

const subject = (step) => step.id.split('/').slice(2).join('/');

/** The names a step's detect lists, as keys: imports, CSS variables and classes. */
const namedUses = (step) => [
  ...(step.detect?.imports ?? []).flatMap((i) => i.names.map((name) => `import:${i.from}:${name}`)),
  ...(step.detect?.cssVars ?? []).map((name) => `cssVar:${name}`),
  ...(step.detect?.classes ?? []).map((name) => `class:${name}`),
];
/** A use key as a consumer reads it: the name, CSS variable, class or subject. */
const useName = (use) => use.slice(use.lastIndexOf(':') + 1);

/**
 * What later releases took away of each deprecation, use by use (hds#451).
 * A deprecation's uses are the names its detect lists (imports, CSS
 * variables, classes) or, with none, its subject. A later step that removes,
 * moves, renames or folds takes each use it lists, or a subject use by its
 * subject; one with the deprecation's subject and no names of its own takes
 * all of it. Only the first release to take a use counts.
 * @param {{ version: string, steps: any[] }[]} ledgers
 * @returns {Map<string, { uses: string[], removed: Map<string, string> }>} by step id;
 *   `removed` maps each use taken to the version that took it
 */
export function deprecationRemovals(ledgers) {
  const out = new Map();
  for (const ledger of ledgers) {
    const later = ledgers.filter((l) => compareVersions(l.version, ledger.version) > 0);
    for (const step of ledger.steps.filter((s) => s.kind === 'deprecated')) {
      const named = namedUses(step);
      const uses = named.length > 0 ? named : [`subject:${subject(step)}`];
      const removed = new Map();
      for (const { version, steps } of later) {
        for (const taker of steps.filter((s) => REMOVING.has(s.kind))) {
          const own = namedUses(taker);
          const takes =
            own.length === 0 && subject(taker) === subject(step)
              ? uses
              : uses.filter((use) => own.includes(use) || use === `subject:${subject(taker)}`);
          for (const use of takes) if (!removed.has(use)) removed.set(use, version);
        }
      }
      out.set(step.id, { uses, removed });
    }
  }
  return out;
}

/** A release's steps by list, every step in exactly one; Do by hand most severe first. */
function listsOf(ledger) {
  const lists = Object.fromEntries(LISTS.map((list) => [list, []]));
  for (const step of ledger.steps) lists[listOf(step)].push(step);
  const severity = (step) => IMPACTS.length - IMPACTS.indexOf(step.impact);
  lists.doByHand = lists.doByHand
    .map((step, i) => [step, i])
    .sort(([a, i], [b, j]) => severity(a) - severity(b) || i - j)
    .map(([step]) => step);
  return lists;
}

/** `a`, `b` and `c`, each in code spans. */
const codeList = (names) => {
  const spans = names.map((name) => `\`${name}\``);
  return spans.length === 1 ? spans[0] : `${spans.slice(0, -1).join(', ')} and ${spans.at(-1)}`;
};

/**
 * `plain` with its one mention of `name`, as a whole word, cut out: the two
 * halves around it, or null when the name is not there exactly once.
 */
function aroundName(plain, name) {
  const parts = plain.split(name);
  if (parts.length !== 2) return null;
  const word = /[A-Za-z0-9_$]/;
  if (word.test(parts[0].at(-1) ?? '') || word.test(parts[1][0] ?? '')) return null;
  return parts;
}

/**
 * The bullets of one list. Steps whose plain lines differ only in their
 * subject's name, with the same tail (the codemod, the removal), share one
 * bullet that names them in step order: 0.20.0 removes 103 names with one
 * sentence. Every other step is a bullet of its own.
 * @param {any[]} steps
 * @param {(step: any) => string} tailOf the text after the plain line
 * @returns {{ steps: any[], text: string }[]}
 */
function bulletsOf(steps, tailOf) {
  const groups = new Map();
  for (const step of steps) {
    const tail = tailOf(step);
    const parts = aroundName(step.plain, subject(step));
    const key = parts ? `${parts.join('\u0000')}\u0000${tail}` : `step\u0000${step.id}`;
    if (!groups.has(key)) groups.set(key, { steps: [], parts, tail });
    groups.get(key).steps.push(step);
  }
  return [...groups.values()].map(({ steps: members, parts, tail }) => {
    if (members.length === 1) return { steps: members, text: `${md(members[0].plain)}${tail}` };
    const these = parts[0] === '' ? 'Each of these' : 'each of these';
    const sentence = md(`${parts[0]}${these}${parts[1]}`).replace(/\.$/, '');
    return { steps: members, text: `${sentence}: ${codeList(members.map(subject))}.${tail}` };
  });
}

/**
 * Prose as Markdown text: the characters GitHub would read as markup are
 * escaped, in a form Prettier leaves as written (it keeps an underscore
 * between two letters unescaped, so this does too).
 */
export function md(text) {
  return text.replace(/[\\`*[<~$_]/g, (char, i) => {
    if (
      char === '_' &&
      /[A-Za-z0-9]/.test(text[i - 1] ?? '') &&
      /[A-Za-z0-9]/.test(text[i + 1] ?? '')
    ) {
      return char;
    }
    return `\\${char}`;
  });
}

/** The version a codemod command pins: the newest release, when it still ships the bin. */
const codemodCommand = (history, auto, version) => {
  const pin = Object.hasOwn(history.bin, auto.codemod) ? history.latest : version;
  return `npx -p ${PACKAGE}@${pin} ${[auto.codemod, ...auto.args].join(' ')} --root .`;
};

function intro({ latest, command }) {
  const knows = `This file only knows the releases up to the version you have installed, ${latest}.`;
  if (command) {
    return `${knows} For newer releases, run \`${ONE_COMMAND}\`: it always fetches the newest steps.`;
  }
  const from =
    compareVersions(latest, ONE_COMMAND_FROM) < 0
      ? `From ${ONE_COMMAND_FROM}`
      : 'In a later release';
  return `${knows} For newer releases, read the newest copy at ${UPGRADING_URL}. ${from}, \`${ONE_COMMAND}\` fetches the newest steps and applies them for you.`;
}

const major = (version) => Number(version.split('.')[0]);

function howTo({ latest, floor: oldest, command }) {
  const older = `from an older version, first reach ${oldest} with the notes in CHANGELOG.md. MIGRATIONS.md has longer guides for the big releases.`;
  if (command) {
    return [
      '```sh',
      ONE_COMMAND,
      '```',
      '',
      `It finds the version you have, moves you to the newest release, runs each release's codemods (Fixed for you) and lists what is left for you (Do by hand). It works from ${oldest} on; ${older}`,
    ];
  }
  const crosses = major(latest) === 0 ? 'a 0.x minor' : 'a major';
  return [
    `1. Install the exact version: \`pnpm add ${PACKAGE}@${latest}\`. \`pnpm update\` never crosses ${crosses}.`,
    '2. For each release you cross, run the codemods listed under Fixed for you.',
    '3. Then work through its Do by hand list.',
    '',
    `This file covers every release after ${oldest}; ${older}`,
  ];
}

/** The link to a release's section of UPGRADING.md. */
const sectionLink = (version) => `[${version}](#${version.replace(/\./g, '')})`;

/** True when `plain` already says `text`, in any case, as whole words. */
function says(plain, text) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, 'i').test(plain);
}

/**
 * What follows a deprecation's plain line: the release that removes it, or,
 * once a later release took some or all of it away (deprecationRemovals),
 * which release did, linked. Nothing when the plain line already says it is
 * removed in that release and none of it went early or in part.
 */
function removalTail(step, removals) {
  const { uses = [], removed = new Map() } = removals?.get(step.id) ?? {};
  const versions = [...new Set(removed.values())].sort(compareVersions);
  const asPlanned =
    removed.size === 0 ||
    (removed.size === uses.length && versions.length === 1 && versions[0] === step.removeIn);
  if (asPlanned && says(step.plain, `removed in ${step.removeIn}`)) return '';
  if (removed.size === 0) return ` Removed in ${step.removeIn}.`;
  const where = versions.map(sectionLink).join(' and ');
  if (removed.size === uses.length) {
    return asPlanned
      ? ` Removed in ${where}.`
      : ` Removed early, in ${where} (planned for ${step.removeIn}).`;
  }
  const gone = uses.filter((use) => removed.has(use)).map(useName);
  return ` ${codeList(gone)} ${gone.length === 1 ? 'was' : 'were'} removed in ${where}; the rest is removed in ${step.removeIn}.`;
}

/** The tail of a step's bullet in `list`: nothing the plain line already says. */
function tailOf(list, removals) {
  if (list === 'fixedForYou') {
    return (step) => {
      const command = [step.auto.codemod, ...step.auto.args].join(' ');
      return says(step.plain, command) ? '' : ` Codemod: \`${command}\`.`;
    };
  }
  if (list === 'comingNext') return (step) => removalTail(step, removals);
  return () => '';
}

/**
 * Every committed release, newest first, with its bullets by list: each step
 * in exactly one bullet of one list (a test holds it to that).
 * @returns {{ ledger: any, lists: Record<string, { steps: any[], text: string }[]> }[]}
 */
export function releaseSections(history) {
  const removals = deprecationRemovals(history.ledgers);
  return [...history.ledgers].reverse().map((ledger) => {
    const steps = listsOf(ledger);
    const lists = Object.fromEntries(
      LISTS.map((list) => [list, bulletsOf(steps[list], tailOf(list, removals))]),
    );
    return { ledger, lists };
  });
}

/** The lines of one list: its heading, any intro, then its bullets. */
function listLines(history, ledger, list, bullets) {
  const lines = [`### ${HEADINGS[list]}`, ''];
  if (list === 'fixedForYou') {
    if (history.command) lines.push('The upgrade command runs these codemods for you.', '');
    else {
      const steps = bullets.flatMap((bullet) => bullet.steps);
      const commands = [
        ...new Set(steps.map((s) => codemodCommand(history, s.auto, ledger.version))),
      ];
      lines.push(
        'Run each codemod once from your project root:',
        '',
        '```sh',
        ...commands.sort(),
        '```',
        '',
      );
    }
  }
  for (const bullet of bullets) lines.push(`- ${bullet.text}`);
  return [...lines, ''];
}

function releaseLines(history, { ledger, lists }) {
  const lines = [
    `## ${ledger.version}`,
    '',
    `Released ${ledger.date} (${ledger.bump}). ${md(ledger.summary)}`,
    '',
  ];
  const filled = LISTS.filter((list) => lists[list].length > 0);
  if (filled.length === 0) return [...lines, 'Nothing in this release asks anything of you.', ''];
  return [...lines, ...filled.flatMap((list) => listLines(history, ledger, list, lists[list]))];
}

/** UPGRADING.md, from the history. */
function renderUpgrading(history) {
  return [
    `# Upgrading ${PACKAGE}`,
    '',
    intro(history),
    '',
    '## How to upgrade',
    '',
    ...howTo(history),
    '',
    ...releaseSections(history).flatMap((section) => releaseLines(history, section)),
    '<!-- Generated by scripts/upgrade/compile.mjs from upgrade/releases/*.json; do not edit. Run node scripts/upgrade/compile.mjs to regenerate. -->',
    '',
  ].join('\n');
}

/** The package.json#exports key of an import specifier, such as `./patterns`. */
const entryOf = (from) =>
  from === PACKAGE
    ? '.'
    : from.startsWith(`${PACKAGE}/`)
      ? `./${from.slice(PACKAGE.length + 1)}`
      : null;

/**
 * What is deprecated today: what no later release took away of each
 * deprecation (deprecationRemovals), one entry per imported name (with the
 * exports key it is imported from) and per class, or one named by the
 * step's subject when it lists neither (a token path, a prop, a prop value),
 * while any of it is left. A subject is a label, not a name to find in code:
 * a reader finds its uses by the detect of the step the entry names. Soonest
 * removal first.
 */
function deprecatedNow(ledgers) {
  const removals = deprecationRemovals(ledgers);
  const out = [];
  for (const step of ledgers.flatMap((ledger) => ledger.steps)) {
    if (step.kind !== 'deprecated') continue;
    const { uses, removed } = removals.get(step.id);
    if (removed.size === uses.length) continue;
    const imports = (step.detect?.imports ?? []).flatMap((i) =>
      i.names
        .filter((name) => !removed.has(`import:${i.from}:${name}`))
        .map((name) => ({ name, entry: entryOf(i.from) })),
    );
    const classes = (step.detect?.classes ?? [])
      .filter((name) => !removed.has(`class:${name}`))
      .map((name) => ({ name, entry: null }));
    const listed = (step.detect?.imports?.length ?? 0) + (step.detect?.classes?.length ?? 0) > 0;
    const names = listed ? [...imports, ...classes] : [{ name: subject(step), entry: null }];
    for (const { name, entry } of names) {
      out.push({ name, ...(entry ? { entry } : {}), removeIn: step.removeIn, step: step.id });
    }
  }
  // Code-point order, not localeCompare: the bytes must not depend on ICU.
  const cmp = (x = '', y = '') => (x < y ? -1 : x > y ? 1 : 0);
  return out.sort(
    (a, b) =>
      compareVersions(a.removeIn, b.removeIn) ||
      cmp(a.name, b.name) ||
      cmp(a.entry, b.entry) ||
      cmp(a.step, b.step),
  );
}

/** upgrade/index.json: the releases the upgrade command knows, its floor and what is deprecated. */
function buildIndex(history) {
  const index = {
    package: PACKAGE,
    latest: history.latest,
    floor: history.floor,
    versions: history.ledgers.map((ledger) => ({
      version: ledger.version,
      date: ledger.date,
      bump: ledger.bump,
      breaking: ledger.steps.filter((step) => step.impact === 'breaking').length,
      summary: ledger.summary,
    })),
    deprecated: deprecatedNow(history.ledgers),
  };
  const result = Index.safeParse(index);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`upgrade/index.json would not fit upgrade/schema.json: ${problems.join('; ')}`);
  }
  return index;
}

/** The first thing to run to reach `version`: the one command, or the exact install. */
const upgradeCommand = ({ command }, version) =>
  command ? ONE_COMMAND : `pnpm add ${PACKAGE}@${version}`;

/** Bullets the Upgrade block shows before it points at UPGRADING.md for the rest. */
const BLOCK_ITEMS = 4;

/**
 * The `### Upgrade` block `--release` puts at the top of the new CHANGELOG
 * section, so the GitHub Release leads with it: the command (the one command,
 * or the exact install while the package lacks it), then at most five lines:
 * the codemods in one line, each Do by hand item, each look and each
 * deprecation, as many as fit in four, and a last line pointing at
 * UPGRADING.md with how many it left out.
 * @param {{ version: string, steps: any[] }} ledger
 * @param {{ command: boolean, bin: Record<string, string> }} pkg
 * @returns {string[]} the block's lines, ending in a blank line
 */
export function upgradeBlock(ledger, { command, bin }) {
  const lists = listsOf(ledger);
  const items = [];
  const fixed = lists.fixedForYou;
  if (fixed.length > 0) {
    const n = `${fixed.length} ${fixed.length === 1 ? 'step' : 'steps'}`;
    const history = { bin, latest: ledger.version };
    const commands = [
      ...new Set(fixed.map((step) => codemodCommand(history, step.auto, ledger.version))),
    ];
    items.push(
      command
        ? `Fixed for you: ${n}, applied by the command above.`
        : `Fixed for you: run ${commands
            .sort()
            .map((c) => `\`${c}\``)
            .join(' and ')} (${n}).`,
    );
  }
  const itemsOf = (list, label) =>
    bulletsOf(lists[list], tailOf(list)).map((bullet) => `${label}: ${bullet.text}`);
  items.push(...itemsOf('doByHand', 'Do by hand'));
  items.push(...itemsOf('looksDifferent', 'Looks different'));
  items.push(...itemsOf('comingNext', 'Coming next'));
  const url = `${UPGRADING_URL}#${ledger.version.replace(/\./g, '')}`;
  const shown = items.slice(0, BLOCK_ITEMS);
  const left = items.length - shown.length;
  const bullets =
    items.length === 0
      ? ['Nothing in this release asks anything of you.']
      : [
          ...shown,
          left > 0
            ? `And ${left} more: see [UPGRADING.md](${url}).`
            : `Every step is also in [UPGRADING.md](${url}).`,
        ];
  return [
    '### Upgrade',
    '',
    '```sh',
    upgradeCommand({ command }, ledger.version),
    '```',
    '',
    ...bullets.map((line) => `- ${line}`),
    '',
  ];
}

/**
 * status.json `release`: the newest release for the fleet dashboard. Scalars
 * only, so Prettier and `pnpm status:fold` leave its layout alone.
 */
function releaseStatus(history) {
  const ledger = history.ledgers.at(-1);
  return {
    version: ledger.version,
    date: ledger.date,
    bump: ledger.bump,
    summary: ledger.summary,
    breaking: ledger.steps.filter((step) => step.impact === 'breaking').length,
    doByHand: listsOf(ledger).doByHand.length,
    floor: history.floor,
    upgrade: upgradeCommand(history, ledger.version),
  };
}

/**
 * What the generated files are compiled from (readHistory), for a repo.
 * @param {{ repo?: string }} [options]
 */
export function compileHistory({ repo = REPO } = {}) {
  return readHistory(repo);
}

/**
 * Everything the compiler generates from the committed history.
 * @param {{ repo?: string }} [options]
 */
export function compileOutputs({ repo = REPO } = {}) {
  const history = readHistory(repo);
  return {
    upgrading: renderUpgrading(history),
    index: formatJson(buildIndex(history)),
    release: releaseStatus(history),
  };
}

/**
 * A release's summary when nothing better is written: what its steps ask of
 * a consumer, counted by list, in one line under the schema's 140 characters.
 * To word it yourself, commit upgrade/pending/summary.txt on main before the
 * Version PR merges (recordRelease reads it).
 */
export function summarize(ledger) {
  const lists = listsOf(ledger);
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const parts = [];
  const hand = lists.doByHand.length;
  if (hand > 0) {
    const breaking = lists.doByHand.filter((step) => step.impact === 'breaking').length;
    parts.push(
      `${count(hand, 'change', 'changes')} to make by hand${breaking ? ` (${breaking} breaking)` : ''}`,
    );
  }
  if (lists.fixedForYou.length > 0) {
    parts.push(`${lists.fixedForYou.length} fixed for you by a codemod`);
  }
  if (lists.looksDifferent.length > 0) {
    const n = lists.looksDifferent.length;
    parts.push(`${n} that ${n === 1 ? 'looks' : 'look'} different`);
  }
  if (lists.comingNext.length > 0) {
    parts.push(count(lists.comingNext.length, 'deprecation', 'deprecations'));
  }
  if (parts.length === 0) return 'Nothing in this release asks anything of a consumer.';
  const last = parts.pop();
  return `${parts.length ? `${parts.join(', ')} and ` : ''}${last}.`;
}

/** The first line of a changeset's text, after its front matter. */
function firstLine(text) {
  const lines = text.split(/\r?\n/);
  const end = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  return (
    lines
      .slice(end + 1)
      .map((line) => line.trim())
      .find(Boolean) ?? null
  );
}

/**
 * A changeset `changeset version` just consumed, read back from git: the
 * Version PR's checkout still has it at HEAD. Null when git does not.
 */
function changesetAtHead(repo, name) {
  try {
    return execFileSync('git', ['show', `HEAD:./.changeset/${name}.md`], {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

/**
 * The commit `changeset version` names in a changeset's CHANGELOG entry: the
 * first seven characters of the newest commit that added the changeset, which
 * @changesets/changelog-git reads with this same git log. Null when git has
 * none (a changeset never committed).
 */
function changesetCommit(repo, name) {
  try {
    const sha = execFileSync(
      'git',
      ['log', '--diff-filter=A', '--max-count=1', '--format=%H', '--', `.changeset/${name}.md`],
      { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    return /^[0-9a-f]{40,64}$/.test(sha) ? sha.slice(0, 7) : null;
  } catch {
    return null;
  }
}

const plainText = (text) => text.replace(/[*_`\\]/g, '');

/**
 * The entries whose text is the changeset's first line. Prettier may have
 * reworded markup in an entry, so a prefix is enough; an entry whose whole
 * text is the line wins over one that only starts with it.
 */
function entriesByText(entries, line) {
  if (!line) return [];
  const bare = (text) => plainText(text.replace(/^[0-9a-f]{7,40}: /, ''));
  const want = plainText(line);
  const candidates = entries.filter((text) => bare(text).startsWith(want.slice(0, 40)));
  const exact = candidates.filter((text) => bare(text) === want);
  return exact.length > 0 ? exact : candidates;
}

/**
 * The citation of a changeset's CHANGELOG entry in `version`'s section:
 * `changeset version` writes it as `- <commit>: <first line>`. The entry is
 * the one with the changeset's commit (changesetCommit) or, when several
 * share that commit or none has it, the one with its first line. The needle
 * is that text from the commit on, cut at a word once it is 40 characters
 * long, or longer until it finds that one line. Null when no single entry
 * matches.
 * @param {{ line: string | null, commit: string | null }} changeset
 */
function entryCite(changelog, version, { line, commit }) {
  const lines = changelog.split('\n');
  const heading = lines.indexOf(`## ${version}`);
  let end = lines.findIndex((l, i) => i > heading && l.startsWith('## '));
  if (end === -1) end = lines.length;
  const all = lines
    .slice(heading + 1, end)
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2));
  const byCommit = commit ? all.filter((text) => text.startsWith(`${commit}: `)) : [];
  const entries =
    byCommit.length === 1 ? byCommit : entriesByText(byCommit.length > 0 ? byCommit : all, line);
  if (entries.length !== 1) return null;
  const words = entries[0].split(' ');
  for (let n = 1; n <= words.length; n++) {
    const needle = words.slice(0, n).join(' ');
    if (needle.length < 40 && n < words.length) continue;
    try {
      return { needle, source: changelogSource(changelog, version, needle) };
    } catch {
      // Not unique yet: take another word.
    }
  }
  return null;
}

/**
 * The CHANGELOG with `block` at the top of `version`'s section. A block
 * already there (a release recorded again) is replaced, up to the next
 * heading, so the section never holds two.
 */
function withUpgradeBlock(changelog, version, block) {
  const lines = changelog.split('\n');
  const heading = lines.indexOf(`## ${version}`);
  if (heading === -1) {
    throw new Error(`CHANGELOG.md has no "## ${version}" section; run changeset version first`);
  }
  const at = lines[heading + 1] === '' ? heading + 2 : heading + 1;
  const lead = at === heading + 1 ? [''] : [];
  let rest = at;
  if (lines[at] === '### Upgrade') {
    rest = lines.findIndex((line, i) => i > at && /^#{2,3} /.test(line));
    if (rest === -1) rest = lines.length;
  }
  return [...lines.slice(0, at), ...lead, ...block, ...lines.slice(rest)].join('\n');
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Records the release `changeset version` just cut (hds#451): package.json
 * names a version past the newest release snapshot and no changeset is
 * pending. Built in memory first, so a fact no note covers stops it with
 * nothing written. Then it writes:
 *
 *   - docs/api/releases/<version>.json, the snapshot of this tree (what the
 *     Version PR will publish), read from source with no build;
 *   - upgrade/sources/<version>/notes/<changeset>.json, each pending note
 *     byte for byte, and release.json citing each one's CHANGELOG entry
 *     (found by the commit that added its changeset, else by its first
 *     line; `.changeset/<name>.md` when neither finds one, which leaves
 *     check-upgrade-ledger red on the Version PR);
 *   - upgrade/releases/<version>.json, built from those by build-ledger;
 *   - the `### Upgrade` block at the top of the version's CHANGELOG section,
 *     before the citations are numbered, so they count its lines;
 *   - the version in upgrade/published.json;
 *
 * and deletes the merged notes (and upgrade/pending/summary.txt) from
 * upgrade/pending. The summary is that file's one line when main has one
 * (the Version PR is regenerated from main on every push, so an edit there
 * does not last), else counted from the steps (summarize). Does nothing when
 * the version already has a snapshot or a ledger, or for a prerelease
 * (changesets pre mode, or any version with a prerelease tag:
 * ./pending.mjs prereleaseReason): a prerelease is not recorded, and its
 * notes wait for the release that follows it.
 *
 * @param {{ repo?: string, date?: string }} [options]
 * @returns {Promise<{ recorded: boolean, prerelease?: string, version: string, notes: string[], uncited: string[] }>}
 */
export async function recordRelease({ repo = REPO, date = today() } = {}) {
  // Lazy: these read TypeScript sources, which --check never needs.
  const { prereleaseReason, readChangesets, readPendingNotes, readReleaseSummary } =
    await import('./pending.mjs');
  const { snapshotFromSource } = await import('./snapshot.mjs');

  const pkg = readJson(join(repo, 'package.json'));
  const { version } = pkg;
  const prerelease = prereleaseReason(repo, version);
  if (prerelease) return { recorded: false, prerelease, version, notes: [], uncited: [] };
  const snapshotsDir = join(repo, 'docs/api/releases');
  const snapshots = releaseVersions(snapshotsDir);
  const ledgerRel = `upgrade/releases/${version}.json`;
  if (snapshots.includes(version) || existsSync(join(repo, ledgerRel))) {
    return { recorded: false, version, notes: [], uncited: [] };
  }
  const previous = snapshots.filter((v) => compareVersions(v, version) < 0).at(-1);
  if (!previous) throw new Error(`no release snapshot below ${version} in docs/api/releases`);
  const pending = readChangesets(repo);
  if (pending.length > 0) {
    throw new Error(
      `${pending.map((c) => c.file).join(', ')} ${pending.length === 1 ? 'is' : 'are'} still pending, so ${version} is not a release changeset version just cut. --release runs inside pnpm changeset:version; to record a release that already published, follow upgrade/README.md, "Recording a release by hand".`,
    );
  }
  const pendingNotes = readPendingNotes(repo);
  const invalid = pendingNotes.filter((n) => n.problems.length > 0);
  if (invalid.length > 0) {
    throw new Error(
      invalid.map((n) => `${n.file}: ${n.problems.join('; ')}`).join('\n') +
        '\nfix the note (pnpm upgrade:note), then rerun pnpm changeset:version',
    );
  }
  const written = readReleaseSummary(repo);
  if (written?.problem) {
    throw new Error(`${written.problem}: fix it, then rerun pnpm changeset:version`);
  }
  const notes = Object.fromEntries(pendingNotes.map((n) => [n.name, n.note]));
  const next = snapshotFromSource(repo);
  const previousSnapshot = readJson(join(snapshotsDir, `${previous}.json`));
  const facts = diffSnapshots(previousSnapshot, next);
  // ledgerFromSources refuses these too, but by step id: name the note.
  const known = new Set(facts.map((fact) => fact.id));
  const stale = pendingNotes.flatMap((n) =>
    (n.note.steps ?? []).flatMap((step) => {
      const ids = (step.facts ?? []).filter((id) => !known.has(id));
      return ids.length ? [`${n.file}: step ${step.id} lists ${ids.join(', ')}`] : [];
    }),
  );
  if (stale.length > 0) {
    throw new Error(
      `${stale.join('\n')}\nthe ${previous} -> ${version} diff has no such fact (the change was reverted, or an earlier release shipped it). Take it out of the note's facts (pnpm upgrade:note then adds a step for any fact still uncovered), then rerun pnpm changeset:version.`,
    );
  }
  const missed = uncoveredFacts(
    facts,
    Object.values(notes).flatMap((note) => note.steps ?? []),
  );
  if (missed.length > 0) {
    throw new Error(
      `${missed.map((fact) => fact.id).join(', ')} (${previous} -> ${version}) ${missed.length === 1 ? 'has' : 'have'} no step in any upgrade/pending note, so ${version} cannot be recorded. Add the step (pnpm upgrade:note) and rerun pnpm changeset:version.`,
    );
  }
  const build = (release) =>
    ledgerFromSources({ release, notes, previous: previousSnapshot, next });

  const draftCites = Object.fromEntries(
    Object.keys(notes).map((name) => [name, { source: `.changeset/${name}.md` }]),
  );
  const draft = { version, previous, date, summary: '-', backfilled: false, notes: draftCites };
  const summary = written?.summary ?? summarize(build(draft));
  const bin = typeof pkg.bin === 'object' && pkg.bin ? pkg.bin : {};
  const block = upgradeBlock(build({ ...draft, summary }), {
    command: Object.hasOwn(bin, ONE_COMMAND_BIN),
    bin,
  });
  const changelog = withUpgradeBlock(
    readFileSync(join(repo, 'CHANGELOG.md'), 'utf8'),
    version,
    block,
  );

  const uncited = [];
  const cites = {};
  for (const name of Object.keys(notes).sort()) {
    const text = changesetAtHead(repo, name);
    const cite = entryCite(changelog, version, {
      line: text === null ? null : firstLine(text),
      commit: changesetCommit(repo, name),
    });
    if (!cite) uncited.push(name);
    cites[name] = cite ?? draftCites[name];
  }
  const release = {
    $comment: `Frozen inputs of the ${version} ledger, written by scripts/upgrade/compile.mjs --release when changeset version cut the release (hds#451): the upgrade notes its changesets carried, frozen under notes/, each citing its changeset's CHANGELOG entry, numbered as the file read when ${version} shipped. The summary is upgrade/pending/summary.txt as main had it, or counted from the steps; the date is the day the Version PR was last regenerated.`,
    version,
    previous,
    date,
    summary,
    backfilled: false,
    notes: cites,
  };
  const ledger = build(release);

  // Everything is built: write it.
  const sources = join(repo, 'upgrade/sources', version);
  mkdirSync(join(sources, 'notes'), { recursive: true });
  for (const n of pendingNotes) {
    writeFileSync(join(sources, 'notes', `${n.name}.json`), readFileSync(join(repo, n.file)));
  }
  writeFileSync(join(sources, 'release.json'), formatJson(release));
  writeFileSync(join(snapshotsDir, `${version}.json`), formatJson(next));
  mkdirSync(dirname(join(repo, ledgerRel)), { recursive: true });
  writeFileSync(join(repo, ledgerRel), formatJson(ledger));
  writeFileSync(join(repo, 'CHANGELOG.md'), changelog);
  const publishedFile = join(repo, 'upgrade/published.json');
  if (existsSync(publishedFile)) {
    const published = readJson(publishedFile);
    if (!published.versions.includes(version)) {
      published.versions = [...published.versions, version].sort(compareVersions);
      writeFileSync(publishedFile, formatJson(published));
    }
  }
  for (const n of pendingNotes) rmSync(join(repo, n.file));
  if (written) rmSync(join(repo, written.file));
  return { recorded: true, version, notes: Object.keys(cites), uncited };
}

/** The generated files, by repo-relative path. */
export const OUTPUTS = {
  upgrading: 'UPGRADING.md',
  index: 'upgrade/index.json',
  status: 'status.json',
};

/** status.json, parsed, or an error that names the fix. */
function parseStatus(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${OUTPUTS.status} is not JSON (${error.message}); fix it, then run ${FIX}.`);
  }
}

/** status.json with `release` set: in place when present, else after `headline`. */
function withRelease(statusText, release) {
  const status = parseStatus(statusText);
  const out = {};
  if (!Object.hasOwn(status, 'release') && !Object.hasOwn(status, 'headline')) {
    return formatJson({ ...status, release });
  }
  for (const [key, value] of Object.entries(status)) {
    if (key === 'release') out.release = release;
    else {
      out[key] = value;
      if (key === 'headline' && !Object.hasOwn(status, 'release')) out.release = release;
    }
  }
  return formatJson(out);
}

/**
 * Writes UPGRADING.md, upgrade/index.json and status.json `release` from the
 * committed ledgers.
 * @param {{ repo?: string }} [options]
 */
export function writeCompiled({ repo = REPO } = {}) {
  const outputs = compileOutputs({ repo });
  writeFileSync(join(repo, OUTPUTS.upgrading), outputs.upgrading);
  mkdirSync(dirname(join(repo, OUTPUTS.index)), { recursive: true });
  writeFileSync(join(repo, OUTPUTS.index), outputs.index);
  const statusFile = join(repo, OUTPUTS.status);
  writeFileSync(statusFile, withRelease(readFileSync(statusFile, 'utf8'), outputs.release));
  return outputs;
}

const stale = (file, why) => ({
  file,
  line: null,
  rule: 'compiled-stale',
  severity: 'error',
  message: `${file} ${why}; run ${FIX}`,
});

/**
 * What differs between the generated files and what this compiler builds
 * from the committed ledgers, in the gate-output shape. Reads only committed
 * files: no network, no build, and it never writes.
 * @param {{ repo?: string }} [options]
 */
export function checkCompiled({ repo = REPO } = {}) {
  const outputs = compileOutputs({ repo });
  const violations = [];
  const text = (rel) =>
    existsSync(join(repo, rel)) ? readFileSync(join(repo, rel), 'utf8') : null;
  for (const key of ['upgrading', 'index']) {
    const committed = text(OUTPUTS[key]);
    if (committed === null) violations.push(stale(OUTPUTS[key], 'is missing'));
    else if (committed !== outputs[key]) {
      violations.push(
        stale(OUTPUTS[key], 'is not what scripts/upgrade/compile.mjs builds from upgrade/releases'),
      );
    }
  }
  const status = text(OUTPUTS.status);
  const release = status === null ? undefined : parseStatus(status).release;
  if (JSON.stringify(release) !== JSON.stringify(outputs.release)) {
    violations.push(
      stale(
        OUTPUTS.status,
        release === undefined
          ? 'has no release object'
          : "has a release object that is not the newest ledger's",
      ),
    );
  }
  return { violations, ok: violations.length === 0 };
}

const USAGE =
  'usage: compile.mjs [--release [--date YYYY-MM-DD]] | --check [--json]  [--repo <dir>]';

/** True for a YYYY-MM-DD that is a real calendar day (2026-02-30 is not). */
const isDay = (text) =>
  /^\d{4}-\d{2}-\d{2}$/.test(text) &&
  !Number.isNaN(Date.parse(text)) &&
  new Date(text).toISOString().startsWith(text);

async function main(argv) {
  const json = hasJsonFlag(argv);
  let check = json;
  let release = false;
  let date;
  let repo = REPO;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') check = true;
    else if (arg === '--json') continue;
    else if (arg === '--release') release = true;
    else if (arg === '--date' && isDay(argv[i + 1] ?? '')) date = argv[++i];
    else if (arg === '--repo' && argv[i + 1]) repo = resolve(argv[++i]);
    else {
      const what =
        arg === '--date'
          ? `--date needs a calendar day, not ${argv[i + 1] ?? 'nothing'}`
          : `unknown argument: ${arg}`;
      console.error(`compile.mjs: ${what}\n${USAGE}`);
      return 2;
    }
  }
  if (check && release) {
    console.error(`compile.mjs: --check never writes, so it does not take --release\n${USAGE}`);
    return 2;
  }
  if (date && !release) {
    console.error(
      `compile.mjs: --date dates the release --release records, so it needs --release\n${USAGE}`,
    );
    return 2;
  }
  if (check) {
    const result = checkCompiled({ repo });
    emitResult(result, json);
    if (!result.ok) {
      for (const v of result.violations) console.error(`✗ compile.mjs — ${v.message}`);
    } else if (!json) {
      console.log(`✓ compile.mjs — ${Object.values(OUTPUTS).join(', ')} match upgrade/releases`);
    }
    return result.ok ? 0 : 1;
  }
  if (release) {
    const result = await recordRelease({ repo, ...(date ? { date } : {}) });
    if (result.prerelease) {
      console.log(
        `compile.mjs: ${result.version} is a prerelease (${result.prerelease}), so it is not recorded; its upgrade notes stay in upgrade/pending for the release that follows it.`,
      );
    } else if (result.recorded) {
      console.log(
        `compile.mjs: recorded ${result.version} (${result.notes.length} upgrade note(s) merged into upgrade/releases/${result.version}.json)`,
      );
      for (const name of result.uncited) {
        console.error(
          `! compile.mjs — no single ${result.version} CHANGELOG entry matches the changeset of upgrade note ${name}, by its commit or its first line, so its steps cite .changeset/${name}.md, which this release deletes; check-upgrade-ledger fails until upgrade/sources/${result.version}/release.json cites the entry`,
        );
      }
    } else {
      console.log(`compile.mjs: ${result.version} is already recorded`);
    }
  }
  writeCompiled({ repo });
  console.log(`compile.mjs: wrote ${Object.values(OUTPUTS).join(', ')}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    console.error(`compile.mjs: ${error?.message ?? error}`);
    process.exitCode = 2;
  }
}
