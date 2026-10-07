/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The Figma rule agents read, kept in one piece (ADR-026, amended 2026-10-07).
 *
 * Adrian's decisions of 2026-10-07:
 *   1. Agents may write components in the HDS library (restyle, fix, add, copy
 *      or redraw), but never delete anything in the library and never publish:
 *      Adrian publishes.
 *   2. Retiring without deleting: a component deprecated in code moves to a
 *      "Deprecated" page and keeps being published; one removed from code moves
 *      to an "Archive" page as "_<Name> (archived <date>)"; Adrian deletes later.
 *   3. The staging copy became the one library, and tokens sync straight into
 *      it (still never deleting; a prune is the promote plugin, run by Adrian).
 *      The old library is retired.
 *   4. HDS Staging (C85ZXnwtVc4AteeIOZfXRC), a clean workbench with the
 *      library enabled and no local variables: an agent drafts a NEW component
 *      there with the library's variables and styles, then ingests it by
 *      redrawing it in the library with the drawing recipe, links its @figma
 *      tag to the library node and deletes the draft. Agents may delete in
 *      staging; Sync and delta.js never target it.
 *
 * Seams under test:
 *   1. ADR-026 keeps its original text and records the amendment with all four.
 *   2. figma/links.json names the one library, the retired file and HDS
 *      Staging, with a comment stating the workbench's purpose and rules.
 *   3. Each steering surface states the library rule in one paragraph
 *      (library, never delete, never publish) and the staging rule in one
 *      (HDS Staging, draft, ingest by redrawing, Sync and delta.js never
 *      target it), and no mention of staging there sends tokens to it or
 *      treats it as the library's duplicate. Session logs in the MCP ledger are
 *      history, so only its preamble is held to this.
 *   4. CLAUDE.md gives each rule one sentence; the README and the recipe give
 *      the exact draft, ingest and cleanup steps.
 *
 * Reads repo files only. Writes nothing and spawns nothing.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const LIBRARY = '2VgBbVpKiDnu0aftJEVyBQ';
const RETIRED = 'c8MaVgwxOlxm4wr8wnH0Z4';
const STAGING = 'C85ZXnwtVc4AteeIOZfXRC';

/** Where an agent learns where it may write in Figma, and the part of each that is current rule. */
const STEERING = {
  'CLAUDE.md': (text) => text,
  'figma/README.md': (text) => text,
  'figma/COMPONENT-DRAWING-RECIPE.md': (text) => text,
  'figma/MCP-LEDGER.md': (text) => text.slice(0, text.indexOf('## How to log')),
  'figma/links.json': (text) =>
    Object.values(JSON.parse(text))
      .filter((v) => typeof v === 'string')
      .join('\n\n'),
};

/** Paragraphs with line breaks folded, so a phrase wrapped over two lines still matches. */
const blocks = (text) => text.split(/\n\s*\n/).map((b) => b.replace(/\s+/g, ' '));
const steering = (rel) => blocks(STEERING[rel](read(rel)));

/** The paragraph (or sentence) that states the library rule: the library, never delete, never publish. */
const statesRule = (block) =>
  /library/i.test(block) && /never delete/i.test(block) && /never publish/i.test(block);
/**
 * The paragraph (or sentence) that states the staging rule: HDS Staging is where a new
 * component is drafted, it is ingested by redrawing it in the library, and Sync and
 * delta.js never target it.
 */
const statesStagingRule = (block) =>
  /HDS Staging/.test(block) &&
  /draft/i.test(block) &&
  /redraw/i.test(block) &&
  /\bSync\b.{0,60}\bnever\b|\bnever\b.{0,60}\bSync\b/.test(block) &&
  /delta\.js/.test(block);
/** A mention of staging as the workbench, or as history (the staging copy that became the library). */
const stagingIsWorkbenchOrHistory = (block) =>
  /HDS Staging|stagingFileKey|workbench|drafts? in staging/.test(block) ||
  /staging[- ]era|formerly|was the staging|until 2026-10-07|before 2026-10-07|became the (one )?library|staging copy/i.test(
    block,
  );
/** Wording of the two-file model this branch replaced, or of the one-file model before HDS Staging. */
const STALE = [
  /no staging file/i,
  /staging is dropped/i,
  /there is one Figma file/i,
  /never delete anything in Figma/i,
  /promotes? (it |staging )?(→|to|into) the library/i,
];
/** Sentences, with code spans and Markdown left intact. */
const sentences = (text) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z"`*(])/)
    .filter(Boolean);

const ADR = 'docs/adr/026-agent-figma-writes.md';
/** ADR-026's amendment section, from its heading to the next `## ` heading or the end. */
function amendment() {
  const text = read(ADR);
  const start = text.indexOf('## Amendment (2026-10-07)');
  if (start === -1) return '';
  const next = text.indexOf('\n## ', start + 1);
  return text.slice(start, next === -1 ? undefined : next).replace(/\s+/g, ' ');
}

describe('ADR-026 records the 2026-10-07 amendment and keeps its history', () => {
  it('keeps the original decision text', () => {
    const text = read(ADR);
    expect(text).toContain('### 2. Never to the published library');
    expect(text).toContain('**read-only to agents**');
    expect(text).toContain('Agent writes target a **staging file**');
  });

  it('dates the amendment on the Status line and in its own section', () => {
    const status = read(ADR)
      .split('\n')
      .find((l) => l.includes('**Status:**'));
    expect(status).toMatch(/amended 2026-10-07/i);
    expect(amendment()).not.toBe('');
  });

  it('decision 1: agents write components in the library, never delete, never publish', () => {
    const body = amendment();
    for (const allowed of [/restyle/i, /\badd\b/i, /copy/i, /redraw/i])
      expect(body).toMatch(allowed);
    expect(body).toMatch(/never delete/i);
    expect(body).toMatch(/never publish/i);
    expect(body).toMatch(/Adrian (clicks Publish|publishes)/);
  });

  it('decision 2: retiring without deleting, through Deprecated and Archive pages', () => {
    const body = amendment();
    expect(body).toMatch(/"Deprecated"/);
    expect(body).toMatch(/Deprecated: use <replacement>\. Removed in <removeIn>\./);
    expect(body).toMatch(/"Archive"/);
    expect(body).toMatch(/_<Name> \(archived 2026-10-07\)/);
    expect(body).toMatch(/leading underscore/i);
  });

  it('decision 3: the copy is the one library, the duplicate staging model is gone, tokens sync into it', () => {
    const body = amendment();
    expect(body).toContain(LIBRARY);
    expect(body).toContain(RETIRED);
    expect(body).toMatch(/no duplicate to promote|nothing to promote/i);
    expect(body).toMatch(/delta\.js/);
    expect(body).toMatch(/Sync/);
    expect(body).toMatch(/--prune/);
    expect(body).toMatch(/promote plugin/);
  });

  it('decision 4: HDS Staging, the workbench where new components are drafted and then ingested', () => {
    const body = amendment();
    expect(body).toContain('### A4.');
    expect(body).toContain(STAGING);
    expect(body).toContain('"HDS Staging"');
    expect(body).toMatch(/no local variables/i);
    expect(body).toMatch(/redraw/i);
    expect(body).toMatch(/cannot copy nodes between files/i);
    expect(body).toMatch(/COMPONENT-DRAWING-RECIPE\.md/);
    expect(body).toMatch(/delete(s)? the draft/i);
    expect(body).toMatch(/may delete in (HDS )?Staging/i);
    expect(body).toMatch(/never (delete|deletes) (anything )?in the library/i);
    expect(body).toMatch(/Sync[^.]*never[^.]*staging|never target (it|HDS Staging|staging)/i);
    expect(body).toMatch(/check-figma-retired-keys/);
  });

  it('keeps the guard rails for every library write and the read budget', () => {
    const body = amendment();
    expect(body).toMatch(/use_figma/);
    expect(body).toMatch(/node ids?/i);
    expect(body).toMatch(/screenshot/i);
    expect(body).toMatch(/200/);
    expect(body).toMatch(/rate-limit/i);
    expect(body).toMatch(/never retry/i);
  });
});

describe('figma/links.json names one library, the retired file and HDS Staging', () => {
  const links = JSON.parse(read('figma/links.json'));

  it('points at the one library', () => {
    expect(links.libraryFileKey).toBe(LIBRARY);
    expect(links.libraryFileName).toBe('HDS Tokens & Components');
  });

  it('records the old library as retired, so a guard can reject links to it', () => {
    expect(links.retiredFiles.map((f) => f.fileKey)).toEqual([RETIRED]);
  });

  it('names HDS Staging, the draft workbench, and states its purpose and rules', () => {
    expect(links.stagingFileKey).toBe(STAGING);
    expect(links.stagingFileName).toBe('HDS Staging');
    const comment = links.$comment_staging.replace(/\s+/g, ' ');
    expect(statesStagingRule(comment)).toBe(true);
    expect(comment).toMatch(/new component/i);
    expect(comment).toMatch(/may delete/i);
    expect(comment).toMatch(/no local variables/i);
    expect(comment).toMatch(/check-figma-retired-keys/);
  });

  it('describes the Sync plugin refusing a retired file first', () => {
    expect(links.$comment_sync).toMatch(/refuses a retired file by key or by name first/);
  });
});

describe('steering surfaces agree with the amended rule', () => {
  it.each(Object.keys(STEERING))('%s states the rule in one paragraph', (rel) => {
    expect(steering(rel).some(statesRule)).toBe(true);
  });

  it.each(Object.keys(STEERING))(
    '%s states the staging rule in one paragraph: draft in HDS Staging, ingest by redrawing, never a token target',
    (rel) => {
      expect(steering(rel).some(statesStagingRule)).toBe(true);
    },
  );

  it.each(Object.keys(STEERING))(
    '%s mentions staging only as the workbench or as history',
    (rel) => {
      const stray = steering(rel).filter(
        (b) => /staging/i.test(b) && !stagingIsWorkbenchOrHistory(b),
      );
      expect(stray).toEqual([]);
    },
  );

  it.each(Object.keys(STEERING))('%s keeps none of the replaced wording', (rel) => {
    const stale = steering(rel).filter((b) => STALE.some((pattern) => pattern.test(b)));
    expect(stale).toEqual([]);
  });

  it.each(Object.keys(STEERING))('%s does not call the library read-only to agents', (rel) => {
    expect(steering(rel).filter((b) => /read-only to agents/i.test(b))).toEqual([]);
  });
});

describe('CLAUDE.md gives each rule one sentence', () => {
  const figma = () => {
    const text = read('CLAUDE.md');
    const start = text.indexOf('- **Figma Sync:**');
    return text.slice(start, text.indexOf('\n## ', start));
  };

  it('one sentence for the library rule', () => {
    expect(sentences(figma()).filter(statesRule)).toHaveLength(1);
  });

  it('one sentence for the staging rule, which also says agents may delete there', () => {
    const staging = sentences(figma()).filter(statesStagingRule);
    expect(staging).toHaveLength(1);
    expect(staging[0]).toMatch(/may delete/i);
  });
});

describe('the steps: draft in staging, ingest to the library, clean up', () => {
  const steps = () => {
    const text = read('figma/README.md');
    const start = text.indexOf('## New components: draft in staging, ingest to the library');
    if (start === -1) return '';
    const next = text.indexOf('\n## ', start + 1);
    return text.slice(start, next === -1 ? undefined : next);
  };

  it('figma/README.md has the section, with numbered steps in order', () => {
    const body = steps();
    expect(body).not.toBe('');
    const order = [
      /HDS Staging/,
      new RegExp(`figma\\.fileKey[^\\n]*${STAGING}|${STAGING}[^\\n]*figma\\.fileKey`),
      /library's (own )?variables and styles/i,
      /redraw/i,
      new RegExp(`figma\\.fileKey[^\\n]*${LIBRARY}|${LIBRARY}[^\\n]*figma\\.fileKey|library key`),
      /@figma/,
      /pnpm manifest:generate/,
      /delete the draft/i,
      /check:figma-retired-keys/,
    ];
    let at = 0;
    for (const pattern of order) {
      const found = body.slice(at).search(pattern);
      expect(found, String(pattern)).toBeGreaterThanOrEqual(0);
      at += found;
    }
    expect(body).toMatch(/^1\. /m);
    expect(body.replace(/\s+/g, ' ')).toMatch(
      /never (go )?(in|to) (the )?(HDS )?Staging|staging has no local variables/i,
    );
  });

  it('the drawing recipe has the ingest and the cleanup steps', () => {
    const recipe = read('figma/COMPONENT-DRAWING-RECIPE.md');
    expect(recipe).toMatch(/^## .*Ingest/m);
    expect(recipe).toMatch(/^## .*[Cc]lean(ing)? ?up/m);
    expect(recipe.replace(/\s+/g, ' ')).toMatch(/cannot copy nodes between files/i);
    expect(recipe).toContain(STAGING);
    expect(recipe).toContain(LIBRARY);
  });
});

const readme = () => read('figma/README.md');
/** A README section, from its `### ` heading to the next heading of any level. */
const section = (heading) => {
  const text = readme();
  const start = text.indexOf(`### ${heading}`);
  if (start === -1) return '';
  const next = text.slice(start + 4).search(/\n#{2,3} /);
  return text.slice(start, next === -1 ? undefined : start + 4 + next).replace(/\s+/g, ' ');
};
/** An ADR's 2026-10-07 amendment, from its heading to the next `## ` heading or the end. */
const adrAmendment = (rel) => {
  const text = read(rel);
  const start = text.indexOf('## Amendment (2026-10-07)');
  if (start === -1) return '';
  const next = text.indexOf('\n## ', start + 1);
  return text.slice(start, next === -1 ? undefined : next).replace(/\s+/g, ' ');
};
const adr032 = () => adrAmendment('docs/adr/032-figma-sync-plugin-receipt.md');
const SYNC_STEPS = 'Sync: the routine path (one click)';

describe('the switch has a safe order, and no carrier lets an agent delete', () => {
  // The rename guards the path where Figma gives no key: there the old library, still named
  // like the library, is told apart only by the marker and Mark's link check.
  const precondition =
    /rename the old (library|file) to "?HDS Tokens & Components \(old\)"? before (you )?load(ing)? the new plugin files/i;

  it('the Sync steps make renaming the old file "(old)" a precondition of the new plugin files', () => {
    expect(section(SYNC_STEPS)).toMatch(precondition);
  });

  it('ADR-032 states the same precondition', () => {
    expect(adr032()).toMatch(precondition);
  });

  it("Mark asks for this file's link, which tells the library from the old file", () => {
    for (const body of [section(SYNC_STEPS), adr032()]) {
      expect(body).toMatch(/Share > Copy link/);
      expect(body).toMatch(/paste (this|the) file's (own )?link/i);
    }
  });

  it('agents never run a --prune build in any carrier', () => {
    const promote = section('Promote plugin and use_figma scripts');
    expect(promote).toMatch(/agents never run a `?--prune`? build in any carrier/i);
    expect(promote).toMatch(/first statement refuses any file but the library/i);
    expect(promote).not.toMatch(/a plugin is the easier path for a full push, a prune/i);
    expect(promote).not.toMatch(/a `--prune` build carries/);
  });

  it('a moved variable left behind is deleted by Adrian, not by an agent', () => {
    const moved = blocks(readme()).find((b) =>
      /Cannot move a variable between collections/.test(b),
    );
    expect(moved).toMatch(/Adrian (then )?deletes the old one/);
  });
});

describe('what Figma gives the Sync plugin matches figma/snapshot.json', () => {
  const snapshot = JSON.parse(read('figma/snapshot.json')).snapshot;
  /** The current-rule part of each surface that explains how Sync tells the files apart. */
  const surfaces = {
    'CLAUDE.md': () => read('CLAUDE.md'),
    'figma/README.md': () => readme(),
    'ADR-026 amendment': () => amendment(),
    'ADR-032 amendment': () => adr032(),
    'ADR-033 amendment': () => adrAmendment('docs/adr/033-zero-click-agent-sync.md'),
    '.status note': () => read('.status/claude-dsr-73-figma-library-writes.md'),
  };
  const claimsNoKey =
    /Figma gives (the|this) plugin no (file )?key|records `?(file\.key|"key"): null`?\)?,? so/i;

  it('the snapshot the Sync plugin took records the file key Figma gave it', () => {
    expect(snapshot.file.key).toBe(LIBRARY);
  });

  it.each(Object.keys(surfaces))('%s does not claim Figma gives the plugin no file key', (name) => {
    const text = surfaces[name]().replace(/\s+/g, ' ');
    expect(text).not.toBe('');
    expect(text.match(claimsNoKey)).toBeNull();
  });

  it('ADR-032 records the key the plugin got and that Sync refuses the old library by it', () => {
    const body = adr032();
    expect(body).toMatch(/659efcc3/);
    expect(body).toMatch(/figma\/snapshot\.json/);
    expect(body).toMatch(new RegExp(`refuses? ${RETIRED} by (its )?key`));
  });

  it('the Sync steps say the same, and keep the rename for the no-key path', () => {
    const steps = section(SYNC_STEPS);
    expect(steps).toMatch(new RegExp(`refuses? the old library by its key,? ${RETIRED}`));
    expect(steps).toMatch(/where Figma gives no (file )?key/i);
  });

  it('the Sync steps say when the new plugin files start to work', () => {
    const steps = section(SYNC_STEPS);
    expect(steps).toMatch(/merged/i);
    expect(steps).toMatch(/Storybook deploy/i);
    expect(steps).toMatch(/out of date/i);
  });
});

describe('the MCP ledger', () => {
  const ledger = () => read('figma/MCP-LEDGER.md');

  it('keeps each day total on one line, so prettier cannot turn a wrapped sum into a list item', () => {
    expect(ledger()).not.toMatch(/^\s*- \d+\. /m);
    expect(ledger()).toMatch(/^.*Calls logged for 2026-10-07: 38 of 200 \(16, 7, 13 and 2\)\.$/m);
  });

  /** Each `## <date> · …` session's "Session total: N calls", in ledger order. */
  const sessionTotals = (date) =>
    ledger()
      .split(/\n(?=## )/)
      .filter((section) => section.startsWith(`## ${date} ·`))
      .map((section) => {
        const total = section.replace(/\s+/g, ' ').match(/Session total: (\d+)\b/);
        return total ? Number(total[1]) : null;
      });

  it("sums each day's sessions, one term per session in ledger order", () => {
    const days = [...ledger().matchAll(/^Calls logged for (\S+): (\d+) of 200 \((.+)\)\.$/gm)];
    expect(days.length).toBeGreaterThan(0);
    for (const [, date, total, terms] of days) {
      const parts = terms.split(/, | and /).map(Number);
      expect(parts, date).toEqual(sessionTotals(date));
      expect(
        parts.reduce((a, b) => a + b, 0),
        date,
      ).toBe(Number(total));
    }
  });
});
