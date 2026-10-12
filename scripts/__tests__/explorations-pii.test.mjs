/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#628 phase 0 — the PII check for exploration fixture data. hds has no PII
 * or denylist tooling (the only denylist in scripts/ is the license one), so
 * this is a minimal check: real-looking phone numbers and email addresses
 * outside the reserved fictional ranges (555-01xx, example.com), plus a
 * denylist of terms (every non-demo tenant's name, and an optional private file).
 * The inputs that must FAIL are written to temp dirs here, never committed.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { clientDenylist, loadDenylistFile, scanPaths, scanText } from '../lib/explorations/pii.mjs';

const tmpDirs = [];
const makeTmp = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'explorations-pii-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
});

const kinds = (findings) => findings.map((f) => f.kind);
const matches = (findings) => findings.map((f) => f.match);

describe('scanText: phone numbers', () => {
  it.each([
    '(312) 555-0142',
    '312-555-0100',
    '312.555.0199',
    '+1 312 555 0123',
    '1-312-555-0150',
    '3125550142',
    '555-0142',
  ])('allows the fictional range: %s', (phone) => {
    expect(scanText(`call ${phone} today`)).toEqual([]);
  });

  it.each([
    ['(312) 867-5309', 'US with parentheses'],
    ['312-867-5309', 'US with dashes'],
    ['312.867.5309', 'US with dots'],
    ['+1 312 867 5309', 'US with a country code'],
    ['3128675309', 'ten bare digits'],
    ['867-5309', 'seven digits with a separator'],
    ['(312) 555-0242', '555 but outside 01xx'],
    ['(312) 556-0142', '01xx but outside 555'],
    ['+44 20 7946 0958', 'an international number'],
  ])('flags %s (%s)', (phone) => {
    const found = scanText(`call ${phone} today`);
    expect(kinds(found)).toEqual(['phone']);
  });

  it('reports the file, the line and the matched text', () => {
    const found = scanText('first line\nsecond (312) 867-5309 here', { file: 'fixture.json' });
    expect(found).toEqual([
      { file: 'fixture.json', line: 2, kind: 'phone', match: '(312) 867-5309' },
    ]);
  });

  it('does not flag the numbers a fixture is full of', () => {
    const text = [
      '"at": "2026-10-12T07:36:33Z"',
      '"due": "2026-10-14"',
      '"value": "$48,200"',
      '"id": "d_1760254593000"',
      '"count": 1234567',
      '"version": "18.3.1"',
      '"ref": "harborlane/ops#585"',
      '"score": 87',
      '"size": "2.4 MB"',
      '"colour": "#6f3fd4"',
      '"epoch": 1760254593',
      '"hex": "a3f9c2d7e1"',
    ].join('\n');
    expect(scanText(text)).toEqual([]);
  });

  it('finds more than one in a line', () => {
    const found = scanText('(312) 867-5309 or (415) 867-5309');
    expect(found).toHaveLength(2);
  });
});

describe('scanText: email addresses', () => {
  it.each([
    'ana@example.com',
    'ops+drops@example.com',
    'a.b@mail.example.com',
    'x@example.org',
    'x@example.net',
  ])('allows %s', (email) => {
    expect(scanText(`write to ${email}`)).toEqual([]);
  });

  it.each([
    'person@gmail.com',
    'ops@acme-hvac.com',
    'ana@example.com.au',
    'ana@notexample.com',
    'first.last@company.co.uk',
  ])('flags %s', (email) => {
    expect(matches(scanText(`write to ${email}`))).toEqual([email]);
  });

  it('does not mistake npm specs, scopes or decorators for email addresses', () => {
    const text = [
      "import { Button } from '@hirobius/design-system';",
      'react@18.3.1 and @types/react@18.3.31',
      '@media (min-width: 40rem) { }',
      '"@hirobius/eslint-plugin-hds": "^0.1.0"',
    ].join('\n');
    expect(scanText(text)).toEqual([]);
  });

  it('flags a mailto link by its address', () => {
    expect(matches(scanText('<a href="mailto:person@gmail.com">mail</a>'))).toEqual([
      'person@gmail.com',
    ]);
  });
});

describe('scanText: the denylist', () => {
  it('flags a term, whatever its case', () => {
    const found = scanText('Prepared for Concrete Creations, LLC', {
      denylist: ['concrete creations'],
    });
    expect(found).toEqual([{ file: '', line: 1, kind: 'denylist', match: 'Concrete Creations' }]);
  });

  it('matches whole words only', () => {
    expect(scanText('a discretionary note', { denylist: ['discreti'] })).toEqual([]);
    expect(scanText('Acme-Co sells ducts', { denylist: ['acme-co'] })).toHaveLength(1);
  });

  it('ignores terms too short to mean anything', () => {
    expect(scanText('an ox in a box', { denylist: ['ox', ''] })).toEqual([]);
  });

  it('escapes regular-expression characters in a term', () => {
    expect(scanText('call a.b (now)', { denylist: ['a.b (now)'] })).toHaveLength(1);
    expect(scanText('call axb (now)', { denylist: ['a.b (now)'] })).toEqual([]);
  });
});

describe('clientDenylist: a client tenant never reaches a board', () => {
  const tenants = (spec) => {
    const root = makeTmp();
    for (const [slug, meta] of Object.entries(spec)) {
      mkdirSync(path.join(root, slug), { recursive: true });
      if (meta) writeFileSync(path.join(root, slug, 'metadata.json'), JSON.stringify(meta));
    }
    return root;
  };

  it('lists the slug and display name of every tenant that is not a demo', () => {
    const root = tenants({
      'real-client': { slug: 'real-client', displayName: 'Real Client Ltd' },
      'accent-lilac': { slug: 'accent-lilac', displayName: 'Accent Lilac', demo: true },
      _template: { slug: '_template', displayName: 'Tenant Template' },
    });
    expect(clientDenylist(root).sort()).toEqual(['Real Client Ltd', 'real-client']);
  });

  it('treats a tenant with no demo flag, or demo: false, as a client', () => {
    const root = tenants({
      a: { slug: 'a-client', displayName: 'A Client', demo: false },
      b: { slug: 'b-client', displayName: 'B Client' },
    });
    expect(clientDenylist(root)).toHaveLength(4);
  });

  it('skips a directory with no readable metadata, and a missing tenants directory', () => {
    expect(clientDenylist(tenants({ broken: null }))).toEqual([]);
    expect(clientDenylist(path.join(makeTmp(), 'missing'))).toEqual([]);
  });

  it('finds the real tenants in this repository, and none of the demo ones', () => {
    const terms = clientDenylist(path.resolve(import.meta.dirname, '..', '..', 'tenants'));
    expect(terms).toContain('concrete-creations');
    expect(terms).not.toContain('brutalist-demo');
    expect(terms).not.toContain('accent-lilac');
    expect(terms).not.toContain('_template');
  });
});

describe('loadDenylistFile: a private list kept outside the repository', () => {
  it('reads one term per line, skipping blanks and # comments', () => {
    const file = path.join(makeTmp(), 'denylist.txt');
    writeFileSync(file, '# private\n\nAlder Bay Plumbing\n  Quarry Road  \n# end\n');
    expect(loadDenylistFile(file)).toEqual(['Alder Bay Plumbing', 'Quarry Road']);
  });

  it('says so when the file is missing, rather than checking against nothing', () => {
    expect(() => loadDenylistFile(path.join(makeTmp(), 'nope.txt'))).toThrow(/denylist file/);
  });
});

describe('scanPaths: files and directories', () => {
  const tree = (files) => {
    const root = makeTmp();
    for (const [rel, text] of Object.entries(files)) {
      const full = path.join(root, rel);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, text);
    }
    return root;
  };

  it('is clean for fictional data', () => {
    const root = tree({
      'fixture.json': '{ "phone": "(312) 555-0142", "email": "ana@example.com" }',
      'src/App.tsx': 'export const App = () => <p>Hello</p>;',
    });
    expect(scanPaths([root])).toEqual([]);
  });

  it('walks directories and reports paths relative to the given root', () => {
    const root = tree({
      'a/fixture.json': '{ "phone": "(312) 867-5309" }',
      'a/b/notes.md': 'mail person@gmail.com',
    });
    const found = scanPaths([root], { root });
    expect(found.map((f) => [f.file, f.kind])).toEqual([
      ['a/b/notes.md', 'email'],
      ['a/fixture.json', 'phone'],
    ]);
  });

  it('accepts a single file', () => {
    const root = tree({ 'one.json': '{ "e": "person@gmail.com" }' });
    expect(scanPaths([path.join(root, 'one.json')])).toHaveLength(1);
  });

  it('checks the denylist too', () => {
    const root = tree({ 'brief.md': 'Pitch to Alder Bay Plumbing' });
    expect(kinds(scanPaths([root], { denylist: ['Alder Bay Plumbing'] }))).toEqual(['denylist']);
  });

  it('skips node_modules and files that are not text', () => {
    const root = tree({
      'node_modules/x/index.js': 'person@gmail.com',
      'shot.png': 'person@gmail.com',
    });
    expect(scanPaths([root])).toEqual([]);
  });

  it('throws for a path that does not exist, rather than passing an empty check', () => {
    expect(() => scanPaths([path.join(makeTmp(), 'missing')])).toThrow(/does not exist/);
  });
});
