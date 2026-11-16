/**
 * Seam under test: /changelog and /changelog/<version>, built from CHANGELOG.md
 * when the site builds. Each release in the file gets a page; the Upgrade block
 * is left to /upgrade/<version>; nothing on the page is typed by hand.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { inlineParts, parseChangelog } from '../../docs-site/lib/release-notes';
import { ReleaseIndexView, ReleaseNotesView } from '../../docs-site/components/release-notes';

const ROOT = join(__dirname, '..', '..');
const CHANGELOG = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');

const SAMPLE = [
  '# Changelog',
  '',
  '## 1.1.0',
  '',
  '### Upgrade',
  '',
  '- Do by hand: rename a prop.',
  '',
  '### Minor Changes',
  '',
  '- abc1234: New `tone` prop on **Badge**, see [the guide](https://example.com/g).',
  '- def5678: Three new tokens:',
  '',
  '  - `a.b`: one.',
  '  - `a.c`: two,',
  '    wrapped.',
  '',
  '  Each ships as a CSS variable.',
  '',
  '  | Old | New |',
  '  | --- | --- |',
  '  | `X` | `Y` |',
  '',
  '  ```ts',
  "  import { Y } from 'pkg';",
  '  ```',
  '',
  '### Patch Changes',
  '',
  '- 0123abc: Fix the hds-link\\_\\_icon motion.',
  '',
  '## 1.0.0',
  '',
  '### Major Changes',
  '',
  '- First release.',
].join('\n');

describe('parseChangelog', () => {
  const releases = parseChangelog(SAMPLE);

  it('reads every release, newest first, and leaves the Upgrade block out', () => {
    expect(releases.map((r) => r.version)).toEqual(['1.1.0', '1.0.0']);
    expect(releases[0]!.groups.map((g) => g.title)).toEqual(['Minor changes', 'Patch changes']);
    expect(JSON.stringify(releases)).not.toContain('Do by hand');
  });

  it('keeps the commit ref, and an entry with none', () => {
    expect(releases[0]!.groups[0]!.entries.map((e) => e.ref)).toEqual(['abc1234', 'def5678']);
    expect(releases[1]!.groups[0]!.entries[0]!.ref).toBeNull();
  });

  it('cuts an entry into its paragraphs, list, table and code', () => {
    expect(releases[0]!.groups[0]!.entries[1]!.blocks).toEqual([
      { type: 'p', text: 'Three new tokens:' },
      { type: 'ul', items: ['`a.b`: one.', '`a.c`: two, wrapped.'] },
      { type: 'p', text: 'Each ships as a CSS variable.' },
      { type: 'table', head: ['Old', 'New'], rows: [['`X`', '`Y`']] },
      { type: 'pre', text: "import { Y } from 'pkg';" },
    ]);
  });

  it('reads inline code, bold and links, and drops the escapes Changesets adds', () => {
    expect(inlineParts('New `tone` on **Badge**, see [g](https://e.com).')).toEqual([
      { type: 'text', text: 'New ' },
      { type: 'code', text: 'tone' },
      { type: 'text', text: ' on ' },
      { type: 'strong', parts: [{ type: 'text', text: 'Badge' }] },
      { type: 'text', text: ', see ' },
      { type: 'link', text: 'g', href: 'https://e.com' },
      { type: 'text', text: '.' },
    ]);
    expect(inlineParts('hds-link\\_\\_icon')).toEqual([{ type: 'text', text: 'hds-link__icon' }]);
  });

  it('reads code inside bold, and italics only at a word edge', () => {
    expect(inlineParts('**The `Hds` aliases are gone**')).toEqual([
      {
        type: 'strong',
        parts: [
          { type: 'text', text: 'The ' },
          { type: 'code', text: 'Hds' },
          { type: 'text', text: ' aliases are gone' },
        ],
      },
    ]);
    expect(inlineParts('the _imports_ list')).toEqual([
      { type: 'text', text: 'the ' },
      { type: 'em', parts: [{ type: 'text', text: 'imports' }] },
      { type: 'text', text: ' list' },
    ]);
    expect(inlineParts('a snake_case_name')).toEqual([{ type: 'text', text: 'a snake_case_name' }]);
  });
});

describe('the real CHANGELOG.md', () => {
  const releases = parseChangelog(CHANGELOG);
  const headings = CHANGELOG.split('\n').filter((l) => /^## \d+\.\d+\.\d+\s*$/.test(l)).length;

  it('gives every release in the file a page, and every one has notes', () => {
    expect(releases).toHaveLength(headings);
    for (const r of releases) expect(r.groups.length, r.version).toBeGreaterThan(0);
  });

  it('loses no entry: every top-level bullet under a change heading is on a page', () => {
    let inChanges = false;
    let bullets = 0;
    for (const line of CHANGELOG.split('\n')) {
      if (line.startsWith('### ')) inChanges = /changes$/i.test(line.trim());
      else if (line.startsWith('## ')) inChanges = false;
      else if (inChanges && line.startsWith('- ')) bullets += 1;
    }
    const entries = releases.flatMap((r) => r.groups.flatMap((g) => g.entries));
    expect(entries).toHaveLength(bullets);
  });

  it('leaves no unrendered bold or code pair in the text', () => {
    const texts = releases.flatMap((r) =>
      r.groups.flatMap((g) =>
        g.entries.flatMap((e) =>
          e.blocks.flatMap((b) => (b.type === 'p' ? [b.text] : b.type === 'ul' ? b.items : [])),
        ),
      ),
    );
    const flat = (parts: ReturnType<typeof inlineParts>): string[] =>
      parts.flatMap((p) => (p.type === 'text' ? [p.text] : 'parts' in p ? flat(p.parts) : []));
    for (const t of texts) {
      // A lone backtick is the file's own (one 0.33.0 entry ends cut off at "\`DESIGN."); a pair is not.
      for (const plain of flat(inlineParts(t))) expect(plain).not.toMatch(/\*\*|`[^`]+`/);
    }
  });

  it('loses no changeset line: every "- <sha>: " entry is on a page', () => {
    const inFile = CHANGELOG.match(/^- [0-9a-f]{7}: /gm)?.length ?? 0;
    const onPages = releases
      .flatMap((r) => r.groups.flatMap((g) => g.entries))
      .filter((e) => e.ref);
    expect(onPages).toHaveLength(inFile);
  });

  it('leaves no raw markdown fence or table pipe in a paragraph', () => {
    const paragraphs = releases
      .flatMap((r) => r.groups.flatMap((g) => g.entries.flatMap((e) => e.blocks)))
      .filter((b) => b.type === 'p');
    for (const p of paragraphs) {
      expect(p.text).not.toMatch(/^```|^\|/);
    }
  });
});

describe('the views', () => {
  const [newest, older] = parseChangelog(SAMPLE);

  it('renders a release with its groups, commit links and neighbours', () => {
    const html = renderToStaticMarkup(
      <ReleaseNotesView
        notes={newest!}
        date="2026-11-16"
        newer={null}
        older="1.0.0"
        hasUpgradePage
      />,
    );
    expect(html).toContain('<h1>Release 1.1.0</h1>');
    expect(html).toContain('Released 2026-11-16');
    expect(html).toContain('Minor changes (2)');
    expect(html).toContain('<code>tone</code>');
    expect(html).toContain('href="https://github.com/hirobius/hds/commit/abc1234"');
    expect(html).toContain('href="/upgrade/1.1.0"');
    expect(html).toContain('href="/changelog/1.0.0"');
    expect(html).toContain('<th>Old</th>');
  });

  it('links no upgrade page for a release without a ledger', () => {
    const html = renderToStaticMarkup(
      <ReleaseNotesView
        notes={older!}
        date={null}
        newer="1.1.0"
        older={null}
        hasUpgradePage={false}
      />,
    );
    expect(html).not.toContain('/upgrade/');
    expect(html).not.toContain('Released');
  });

  it('lists every release with its change count', () => {
    const html = renderToStaticMarkup(
      <ReleaseIndexView releases={[newest!, older!]} dates={{ '1.1.0': '2026-11-16' }} />,
    );
    expect(html).toContain('href="/changelog/1.1.0"');
    expect(html).toContain('2026-11-16 · 3 changes');
    expect(html).toContain('1 change<');
  });
});
