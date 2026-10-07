/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The Figma rule agents read, kept in one piece (ADR-026, amended 2026-10-07).
 *
 * Adrian's three decisions of 2026-10-07:
 *   1. Agents may write components in the HDS library (restyle, add, copy or
 *      redraw), but never delete anything in Figma and never publish: Adrian
 *      publishes.
 *   2. Retiring without deleting: a component deprecated in code moves to a
 *      "Deprecated" page and keeps being published; one removed from code moves
 *      to an "Archive" page as "_<Name> (archived <date>)"; Adrian deletes later.
 *   3. The staging copy became the one library; there is no staging file, and
 *      tokens sync straight into the library (still never deleting; a prune is
 *      the promote plugin, run by Adrian). The old library is retired.
 *
 * Seams under test:
 *   1. ADR-026 keeps its original text and records the amendment with all three.
 *   2. figma/links.json names the one library and the retired file, and no
 *      staging file.
 *   3. Each steering surface states the rule in one paragraph (library, never
 *      delete, never publish), and every mention of staging there says it is
 *      gone. Session logs in the MCP ledger are history, so only its preamble
 *      is held to this.
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

/** The paragraph that states the rule: the library, never delete, never publish. */
const statesRule = (block) =>
  /library/i.test(block) && /never delete/i.test(block) && /never publish/i.test(block);
/** A mention of staging that says it is gone, not one that sends an agent there. */
const stagingIsGone = (block) =>
  /no staging|staging (file |copy )?(was|is) (dropped|retired|gone)|staging[- ]era|formerly|was the staging|until 2026-10-07|before 2026-10-07|became the (one )?library|stagingFileKey.*(retired|dropped|gone)/i.test(
    block,
  );

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

  it('decision 3: the copy is the one library, staging is dropped, tokens sync into it', () => {
    const body = amendment();
    expect(body).toContain(LIBRARY);
    expect(body).toContain(RETIRED);
    expect(body).toMatch(/no staging file|staging is dropped/i);
    expect(body).toMatch(/delta\.js/);
    expect(body).toMatch(/Sync/);
    expect(body).toMatch(/--prune/);
    expect(body).toMatch(/promote plugin/);
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

describe('figma/links.json names one library and the retired file', () => {
  const links = JSON.parse(read('figma/links.json'));

  it('points at the one library', () => {
    expect(links.libraryFileKey).toBe(LIBRARY);
    expect(links.libraryFileName).toBe('HDS Tokens & Components');
  });

  it('records the old library as retired, so a guard can reject links to it', () => {
    expect(links.retiredFiles.map((f) => f.fileKey)).toEqual([RETIRED]);
  });

  it('names no staging file', () => {
    expect(Object.keys(links).filter((key) => /staging/i.test(key))).toEqual([]);
  });

  it('describes the Sync plugin refusing a retired file first', () => {
    expect(links.$comment_sync).toMatch(/refuses a retired file by key or by name first/);
  });
});

describe('steering surfaces agree with the amended rule', () => {
  it.each(Object.keys(STEERING))('%s states the rule in one paragraph', (rel) => {
    expect(steering(rel).some(statesRule)).toBe(true);
  });

  it.each(Object.keys(STEERING))('%s never sends an agent to a staging file', (rel) => {
    const stale = steering(rel).filter((b) => /staging/i.test(b) && !stagingIsGone(b));
    expect(stale).toEqual([]);
  });

  it.each(Object.keys(STEERING))('%s does not call the library read-only to agents', (rel) => {
    expect(steering(rel).filter((b) => /read-only to agents/i.test(b))).toEqual([]);
  });
});

describe('the switch has a safe order, and no carrier lets an agent delete', () => {
  const readme = () => read('figma/README.md');
  /** A README section, from its `### ` heading to the next heading of any level. */
  const section = (heading) => {
    const text = readme();
    const start = text.indexOf(`### ${heading}`);
    if (start === -1) return '';
    const next = text.slice(start + 4).search(/\n#{2,3} /);
    return text.slice(start, next === -1 ? undefined : start + 4 + next).replace(/\s+/g, ' ');
  };
  /** ADR-032's 2026-10-07 amendment, from its heading to the next `## ` heading or the end. */
  const adr032 = () => {
    const text = read('docs/adr/032-figma-sync-plugin-receipt.md');
    const start = text.indexOf('## Amendment (2026-10-07)');
    if (start === -1) return '';
    const next = text.indexOf('\n## ', start + 1);
    return text.slice(start, next === -1 ? undefined : next).replace(/\s+/g, ' ');
  };
  // Until it is renamed, the old library has the library's name, and Figma gives the plugin no key.
  const precondition =
    /rename the old (library|file) to "?HDS Tokens & Components \(old\)"? before (you )?load(ing)? the new plugin files/i;

  it('the Sync steps make renaming the old file "(old)" a precondition of the new plugin files', () => {
    expect(section('Sync: the routine path (one click)')).toMatch(precondition);
  });

  it('ADR-032 states the same precondition', () => {
    expect(adr032()).toMatch(precondition);
  });

  it("Mark asks for this file's link, which tells the library from the old file", () => {
    for (const body of [section('Sync: the routine path (one click)'), adr032()]) {
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

describe('the MCP ledger', () => {
  const ledger = () => read('figma/MCP-LEDGER.md');

  it('keeps each day total on one line, so prettier cannot turn a wrapped sum into a list item', () => {
    expect(ledger()).not.toMatch(/^\s*- \d+\. /m);
    expect(ledger()).toMatch(/^.*Calls logged for 2026-10-07: 36 of 200 \(16, 7 and 13\)\.$/m);
  });
});
