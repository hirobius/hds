/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#628 phase 0 — the gates by direction. A and B must have 0 lint
 * violations; C may have them only where its bend-log.json lists each one (and
 * says what system change would make it legal). Tested at the public seam:
 * a direction in (its sources and meta files), checks out. The build and axe
 * halves are tested through the orchestrator in eval-explorations.test.mjs.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BEND_KINDS,
  PLUGIN_KINDS,
  matchBends,
  readTenants,
  validateBendLog,
  validateRationale,
  validateRefs,
} from '../lib/explorations/direction.mjs';
import { judgeStatic } from '../lib/explorations/gates.mjs';
import { CLEAN_APP, HEX_APP, TENANTS, direction, gap } from './helpers/explorations-fixtures.mjs';

const ctx = { tenants: TENANTS, denylist: [] };
const status = (r, name) => r.checks.find((c) => c.name === name)?.status;
const detail = (r, name) => r.checks.find((c) => c.name === name)?.detail.join('\n');

describe('validateBendLog', () => {
  const scannerBend = {
    kind: 'hex',
    file: 'src/App.tsx',
    match: '#7c3aed',
    why: 'The hero needs a violet the palette has no step for.',
    change: 'token: add a supporting accent (primitive violet) to the semantic tier',
  };
  const ruleBend = {
    kind: 'design-rule',
    rule: 'DESIGN.md: no gradients',
    why: 'A soft fade from page to card sets the hero apart.',
    change: 'rule: allow one token-driven gradient on a hero surface',
  };

  it("knows the six scanner kinds, the lint plugin's error rules and design-rule", () => {
    expect(BEND_KINDS).toEqual([
      'hex',
      'colour-fn',
      'px',
      'raw-control',
      'custom-css',
      'tailwind',
      ...PLUGIN_KINDS,
      'design-rule',
    ]);
    expect(PLUGIN_KINDS).toEqual(expect.arrayContaining(['hds/no-raw-controls']));
  });

  it('accepts a bend that names a lint plugin rule, shaped like a scanner bend', () => {
    const r = validateBendLog([{ ...scannerBend, kind: 'hds/no-raw-controls', match: 'form' }]);
    expect(r).toMatchObject({ ok: true, problems: [] });
  });

  it('accepts an empty log, a scanner bend and a design-rule bend', () => {
    expect(validateBendLog([]).ok).toBe(true);
    expect(validateBendLog([scannerBend, ruleBend])).toMatchObject({ ok: true, problems: [] });
  });

  it('requires why and change on every bend: the system change that would make it legal', () => {
    const r = validateBendLog([
      { ...scannerBend, change: '' },
      { ...ruleBend, why: undefined },
    ]);
    expect(r.problems).toEqual([
      'bend 1: change must be a non-empty string',
      'bend 2: missing why',
    ]);
  });

  it('requires file and match on a scanner bend, and rule on a design-rule bend', () => {
    const r = validateBendLog([
      { kind: 'px', why: 'w', change: 'c' },
      { kind: 'design-rule', why: 'w', change: 'c' },
    ]);
    expect(r.problems).toEqual([
      'bend 1: missing file',
      'bend 1: missing match',
      'bend 2: missing rule',
    ]);
  });

  it('rejects an unknown kind, an unexpected key and a log that is not an array', () => {
    expect(validateBendLog([{ ...scannerBend, kind: 'glow' }]).problems.join()).toMatch(
      /kind "glow"/,
    );
    expect(validateBendLog([{ ...scannerBend, line: 3 }]).problems.join()).toMatch(
      /unexpected key line/,
    );
    expect(validateBendLog({}).problems.join()).toMatch(/must be an array/);
  });
});

describe('matchBends: which violations a bend log accepts', () => {
  const hit = (over = {}) => ({
    kind: 'hex',
    file: 'src/App.tsx',
    line: 7,
    match: '#7c3aed',
    ...over,
  });
  const bend = (over = {}) => ({
    kind: 'hex',
    file: 'src/App.tsx',
    match: '#7c3aed',
    why: 'w',
    change: 'c',
    ...over,
  });

  it('lists a violation with no bend as unlisted', () => {
    expect(matchBends([hit()], [])).toEqual({ listed: [], unlisted: [hit()], stale: [] });
  });

  it('lists a violation whose kind, file and match a bend names', () => {
    const r = matchBends([hit()], [bend()]);
    expect(r.listed).toEqual([hit()]);
    expect(r.unlisted).toEqual([]);
  });

  it('lets one bend cover every occurrence of the same text in the same file, whatever the line', () => {
    const r = matchBends([hit({ line: 7 }), hit({ line: 90 })], [bend()]);
    expect(r.listed).toHaveLength(2);
    expect(r.unlisted).toEqual([]);
  });

  it('does not let a bend for one file, kind or text cover another', () => {
    const r = matchBends(
      [hit({ file: 'src/Other.tsx' }), hit({ kind: 'colour-fn' }), hit({ match: '#fff' })],
      [bend()],
    );
    expect(r.unlisted).toHaveLength(3);
  });

  it('reports a scanner bend that matches no violation as stale', () => {
    expect(matchBends([], [bend()]).stale).toEqual([bend()]);
  });

  it('never reports a design-rule bend as stale: no scanner can see it', () => {
    const rule = { kind: 'design-rule', rule: 'no gradients', why: 'w', change: 'c' };
    expect(matchBends([], [rule]).stale).toEqual([]);
  });
});

describe('validateRationale', () => {
  it('accepts one line, with or without a trailing newline', () => {
    expect(validateRationale('One line.')).toEqual([]);
    expect(validateRationale('One line.\n')).toEqual([]);
  });

  it('rejects an empty file, more than one line, and a line too long for a caption', () => {
    expect(validateRationale('  \n')).toEqual(['rationale.md is empty']);
    expect(validateRationale('One.\nTwo.\n')).toEqual(['rationale.md must be one line, found 2']);
    expect(validateRationale('x'.repeat(241))).toEqual([
      'rationale.md is 241 characters; keep it to 240 or fewer',
    ]);
  });
});

describe('validateRefs', () => {
  const refs = (over = {}) => ({
    tenant: 'accent-lilac',
    searches: [{ tool: 'search', query: 'status bands' }],
    refs: [{ url: 'https://21st.dev/x', took: 'Idea: collapse after three rows' }],
    ...over,
  });

  it('accepts a complete refs file for B', () => {
    expect(validateRefs(refs(), { letter: 'B', tenants: TENANTS })).toMatchObject({
      ok: true,
      problems: [],
    });
  });

  it('accepts no searches and no refs: a direction may not have needed any', () => {
    const r = validateRefs(
      { tenant: null, searches: [], refs: [] },
      { letter: 'A', tenants: TENANTS },
    );
    expect(r.ok).toBe(true);
  });

  it('requires A to use the HDS default, so Faithful stays faithful', () => {
    const r = validateRefs(refs(), { letter: 'A', tenants: TENANTS });
    expect(r.problems.join()).toMatch(/direction A renders at the HDS default/);
  });

  it('requires B to push tokens through a tenant, so Ceiling is not a second A', () => {
    const r = validateRefs(refs({ tenant: null }), { letter: 'B', tenants: TENANTS });
    expect(r.problems.join()).toMatch(/direction B must declare a demo tenant/);
  });

  it('lets C use a tenant or none', () => {
    expect(validateRefs(refs({ tenant: null }), { letter: 'C', tenants: TENANTS }).ok).toBe(true);
    expect(validateRefs(refs(), { letter: 'C', tenants: TENANTS }).ok).toBe(true);
  });

  it('refuses a client tenant, and says why', () => {
    const r = validateRefs(refs({ tenant: 'alder-bay-plumbing' }), {
      letter: 'B',
      tenants: TENANTS,
    });
    expect(r.problems.join()).toMatch(/alder-bay-plumbing.*not a demo tenant.*"demo": true/);
  });

  it('refuses a tenant that does not exist', () => {
    const r = validateRefs(refs({ tenant: 'soft-demo' }), { letter: 'B', tenants: TENANTS });
    expect(r.problems.join()).toMatch(/no tenant "soft-demo"/);
  });

  it('checks each search and each ref', () => {
    const r = validateRefs(
      refs({
        searches: [
          { tool: 'delete_component', query: 'x' },
          { tool: 'search' },
          { tool: 'get_component', query: 'tabs' },
        ],
        refs: [{ url: 'not a url', took: 'x' }, { url: 'https://21st.dev/y' }],
      }),
      { letter: 'B', tenants: TENANTS },
    );
    const text = r.problems.join('\n');
    expect(text).toMatch(/search 1: tool "delete_component" is not one of/);
    expect(text).toMatch(/search 2: query must be a non-empty string/);
    expect(text).toMatch(/search 3: a get_component call needs a reason/);
    expect(text).toMatch(/ref 1: url must be an https URL/);
    expect(text).toMatch(/ref 2: took must be a non-empty string/);
  });

  it('rejects an unexpected key and a file that is not an object', () => {
    expect(
      validateRefs(refs({ code: 'x' }), { letter: 'B', tenants: TENANTS }).problems.join(),
    ).toMatch(/unexpected key code/);
    expect(validateRefs([], { letter: 'B', tenants: TENANTS }).ok).toBe(false);
  });
});

describe('readTenants', () => {
  it('maps each tenant of this repository to whether it is a demo', () => {
    const tenants = readTenants(path.resolve(import.meta.dirname, '..', '..', 'tenants'));
    expect(tenants['brutalist-demo']).toEqual({ demo: true });
    expect(tenants['accent-lilac']).toEqual({ demo: true });
    // At least one client tenant, read as not a demo (named only on disk, not here).
    expect(Object.values(tenants)).toContainEqual({ demo: false });
    for (const v of Object.values(tenants)) expect(typeof v.demo).toBe('boolean');
    expect(tenants._template).toBeUndefined();
  });
});

describe('judgeStatic: A and B, 0 lint violations', () => {
  it.each(['A', 'B'])('passes a clean %s with all its meta files', (letter) => {
    const r = judgeStatic(direction(letter), ctx);
    expect(r.pass).toBe(true);
    expect(r.checks.map((c) => [c.name, c.status])).toEqual([
      ['layout', 'pass'],
      ['lint', 'pass'],
      ['gaps', 'pass'],
      ['pii', 'pass'],
    ]);
  });

  it.each(['A', 'B'])('fails %s on a raw hex, naming the file, line and text', (letter) => {
    const r = judgeStatic(direction(letter, { files: { 'src/App.tsx': HEX_APP } }), ctx);
    expect(r.pass).toBe(false);
    expect(status(r, 'lint')).toBe('fail');
    expect(detail(r, 'lint')).toMatch(/src\/App\.tsx:\d+ hex #7c3aed/);
  });

  it.each(['A', 'B'])('does not let %s excuse a violation with a bend log', (letter) => {
    const d = direction(letter, {
      files: { 'src/App.tsx': HEX_APP },
      meta: {
        bendLog: {
          present: true,
          value: [{ kind: 'hex', file: 'src/App.tsx', match: '#7c3aed', why: 'w', change: 'c' }],
        },
      },
    });
    const r = judgeStatic(d, ctx);
    expect(status(r, 'layout')).toBe('fail');
    expect(detail(r, 'layout')).toMatch(/bend-log\.json is for direction C only/);
    expect(status(r, 'lint')).toBe('fail');
  });

  it.each([
    ['a raw button', '<button>Save</button>', 'raw-control'],
    ['a Tailwind class', '<div className="flex p-4" />', 'tailwind'],
    ['a raw px value', '<div style={{ width: "12px" }} />', 'px'],
    ['an rgb() colour', '<div style={{ color: "rgb(1, 2, 3)" }} />', 'colour-fn'],
  ])('fails on %s', (_, jsx, kind) => {
    const app = CLEAN_APP.replace('<Button>Save</Button>', jsx);
    const r = judgeStatic(direction('A', { files: { 'src/App.tsx': app } }), ctx);
    expect(status(r, 'lint')).toBe('fail');
    expect(detail(r, 'lint')).toContain(kind);
  });
});

describe('judgeStatic: C may bend, but only what it lists', () => {
  const bendFor = (over = {}) => ({
    kind: 'hex',
    file: 'src/App.tsx',
    match: '#7c3aed',
    why: 'The hero needs a violet the palette has no step for.',
    change: 'token: add a supporting accent to the semantic tier',
    ...over,
  });
  const cApp = (bends) =>
    direction('C', {
      files: { 'src/App.tsx': HEX_APP },
      meta: { bendLog: { present: true, value: bends } },
    });

  it('FAILS a C app whose violation is not in its bend log', () => {
    const r = judgeStatic(cApp([]), ctx);
    expect(r.pass).toBe(false);
    expect(status(r, 'lint')).toBe('fail');
    expect(detail(r, 'lint')).toMatch(/not in bend-log\.json.*src\/App\.tsx:\d+ hex #7c3aed/s);
  });

  it('PASSES the same app once the violation is listed', () => {
    const r = judgeStatic(cApp([bendFor()]), ctx);
    expect(r.pass).toBe(true);
    expect(status(r, 'lint')).toBe('pass');
    expect(r.checks.find((c) => c.name === 'lint').text).toMatch(/1 violation.*all listed/);
  });

  it('still fails when the log lists a different violation than the one in the code', () => {
    const r = judgeStatic(cApp([bendFor({ match: '#000000' })]), ctx);
    expect(status(r, 'lint')).toBe('fail');
    expect(detail(r, 'lint')).toMatch(/#7c3aed/);
  });

  it('fails a bend that lists a violation the code no longer has, so the log stays true', () => {
    const r = judgeStatic(
      direction('C', {
        files: { 'src/App.tsx': CLEAN_APP },
        meta: { bendLog: { present: true, value: [bendFor()] } },
      }),
      ctx,
    );
    expect(status(r, 'lint')).toBe('fail');
    expect(detail(r, 'lint')).toMatch(/lists a violation the code does not have.*#7c3aed/s);
  });

  it('passes a C with design-rule bends and no scanner violations', () => {
    const r = judgeStatic(
      direction('C', {
        meta: {
          bendLog: {
            present: true,
            value: [
              {
                kind: 'design-rule',
                rule: 'DESIGN.md: no gradients',
                why: 'w',
                change: 'rule: one token-driven gradient on a hero',
              },
            ],
          },
        },
      }),
      ctx,
    );
    expect(r.pass).toBe(true);
  });

  it('fails a C with no bend-log.json at all: [] says there was nothing to bend', () => {
    const r = judgeStatic(direction('C', { meta: { bendLog: { present: false } } }), ctx);
    expect(status(r, 'layout')).toBe('fail');
    expect(detail(r, 'layout')).toMatch(/bend-log\.json is missing.*\[\]/);
  });

  it('fails a bend log that is not valid, with its problems', () => {
    const r = judgeStatic(
      direction('C', {
        meta: { bendLog: { present: true, value: [{ kind: 'hex', file: 'a', match: 'b' }] } },
      }),
      ctx,
    );
    expect(status(r, 'layout')).toBe('fail');
    expect(detail(r, 'layout')).toMatch(/bend 1: missing why/);
  });

  it('applies the same lint rules to C as to A and B, bends aside', () => {
    const app = CLEAN_APP.replace('<Button>Save</Button>', '<button>Save</button>');
    const bend = {
      kind: 'raw-control',
      file: 'src/App.tsx',
      match: '<button',
      why: 'w',
      change: 'c',
    };
    const bare = judgeStatic(direction('C', { files: { 'src/App.tsx': app } }), ctx);
    expect(status(bare, 'lint')).toBe('fail');
    const listed = judgeStatic(
      direction('C', {
        files: { 'src/App.tsx': app },
        meta: { bendLog: { present: true, value: [bend] } },
      }),
      ctx,
    );
    expect(status(listed, 'lint')).toBe('pass');
  });
});

describe('judgeStatic: the lint plugin runs beside the scan (hds#628: "pass the lint plugin")', () => {
  const FORM_APP = CLEAN_APP.replace(
    '<Button>Save</Button>',
    '<form onSubmit={() => {}}><Button>Save</Button></form>',
  );
  const SPACING_APP = CLEAN_APP.replace(
    '<Button>Save</Button>',
    '<Button style={{ padding: 16 }}>Save</Button>',
  );
  const formBend = {
    kind: 'hds/no-raw-controls',
    file: 'src/App.tsx',
    match: 'form',
    why: 'The capture box posts on Enter, which the Form pattern does not do yet.',
    change: 'component: let Form submit on Enter from a single field',
  };

  it.each(['A', 'B'])('fails %s on a raw <form>, which only the plugin sees', (letter) => {
    const r = judgeStatic(direction(letter, { files: { 'src/App.tsx': FORM_APP } }), ctx);
    expect(status(r, 'lint')).toBe('fail');
    expect(detail(r, 'lint')).toMatch(/src\/App\.tsx:\d+ hds\/no-raw-controls form/);
  });

  it.each(['A', 'B'])('fails %s on a bare number on a spacing prop in style', (letter) => {
    const r = judgeStatic(direction(letter, { files: { 'src/App.tsx': SPACING_APP } }), ctx);
    expect(status(r, 'lint')).toBe('fail');
    expect(detail(r, 'lint')).toMatch(/hds\/no-raw-px-spacing 16/);
  });

  it('FAILS a C whose plugin violation is not in its bend log, and PASSES it once listed', () => {
    const files = { 'src/App.tsx': FORM_APP };
    const bare = judgeStatic(
      direction('C', { files, meta: { bendLog: { present: true, value: [] } } }),
      ctx,
    );
    expect(status(bare, 'lint')).toBe('fail');
    expect(detail(bare, 'lint')).toMatch(/not in bend-log\.json.*hds\/no-raw-controls form/s);
    const listed = judgeStatic(
      direction('C', { files, meta: { bendLog: { present: true, value: [formBend] } } }),
      ctx,
    );
    expect(status(listed, 'lint')).toBe('pass');
  });

  it('counts a violation both tools see once: one bend covers it', () => {
    // HEX_APP puts the hex in Box sx, which the plugin's sx-token-first also flags
    const r = judgeStatic(
      direction('C', {
        files: { 'src/App.tsx': HEX_APP },
        meta: {
          bendLog: {
            present: true,
            value: [{ ...formBend, kind: 'hex', match: '#7c3aed' }],
          },
        },
      }),
      ctx,
    );
    expect(status(r, 'lint')).toBe('pass');
    expect(r.hits.map((h) => h.kind)).toEqual(['hex']);
  });

  it('cannot be switched off with an eslint-disable comment', () => {
    const app = `/* eslint-disable */\n${FORM_APP}`;
    const r = judgeStatic(direction('A', { files: { 'src/App.tsx': app } }), ctx);
    expect(status(r, 'lint')).toBe('fail');
  });
});

describe('judgeStatic: the run layout', () => {
  it('fails a direction with no src/App.tsx', () => {
    const r = judgeStatic(direction('A', { files: {}, texts: {} }), ctx);
    expect(detail(r, 'layout')).toMatch(/src\/App\.tsx is missing/);
  });

  it('fails a missing rationale.md, and one that is not one line', () => {
    const missing = judgeStatic(direction('A', { meta: { rationale: { present: false } } }), ctx);
    expect(detail(missing, 'layout')).toMatch(/rationale\.md is missing/);
    const long = judgeStatic(
      direction('A', { meta: { rationale: { present: true, text: 'a\nb\n' } } }),
      ctx,
    );
    expect(detail(long, 'layout')).toMatch(/rationale\.md must be one line, found 2/);
  });

  it('fails a missing or unreadable refs.json', () => {
    const missing = judgeStatic(direction('A', { meta: { refs: { present: false } } }), ctx);
    expect(detail(missing, 'layout')).toMatch(/refs\.json is missing/);
    const bad = judgeStatic(
      direction('A', { meta: { refs: { present: true, error: 'Unexpected token' } } }),
      ctx,
    );
    expect(detail(bad, 'layout')).toMatch(/refs\.json is not valid JSON \(Unexpected token\)/);
  });

  it('fails a tenant that is not a demo, through refs.json', () => {
    const r = judgeStatic(
      direction('B', {
        meta: {
          refs: {
            present: true,
            value: { tenant: 'alder-bay-plumbing', searches: [], refs: [] },
          },
        },
      }),
      ctx,
    );
    expect(detail(r, 'layout')).toMatch(/not a demo tenant/);
  });

  it('reports the declared tenant, so the renderer knows what to apply', () => {
    expect(judgeStatic(direction('B'), ctx).tenant).toBe('accent-lilac');
    expect(judgeStatic(direction('A'), ctx).tenant).toBeNull();
  });
});

describe('judgeStatic: the gap log', () => {
  it('fails a missing gaps.json: write [] when a direction needed nothing', () => {
    const r = judgeStatic(direction('A', { meta: { gaps: { present: false } } }), ctx);
    expect(status(r, 'gaps')).toBe('fail');
    expect(detail(r, 'gaps')).toMatch(/gaps\.json is missing.*\[\]/);
  });

  it('fails an invalid gap log with its problems, and one filed under another direction', () => {
    const bad = judgeStatic(
      direction('A', { meta: { gaps: { present: true, value: [{ screen: 'standing' }] } } }),
      ctx,
    );
    expect(status(bad, 'gaps')).toBe('fail');
    expect(detail(bad, 'gaps')).toMatch(/gap 1: missing kind/);
    const wrong = judgeStatic(
      direction('A', { meta: { gaps: { present: true, value: [gap('pitch', 'A')] } } }),
      ctx,
    );
    expect(detail(wrong, 'gaps')).toMatch(/does not match the directory it is in \(standing\)/);
  });

  it('passes an empty gap log', () => {
    const r = judgeStatic(direction('A', { meta: { gaps: { present: true, value: [] } } }), ctx);
    expect(status(r, 'gaps')).toBe('pass');
  });
});

describe('judgeStatic: PII in what would be published', () => {
  it('fails a real-looking phone number in the fixture data under src/', () => {
    const r = judgeStatic(
      direction('A', { texts: { 'src/fixture.json': '{ "phone": "(312) 867-5309" }' } }),
      ctx,
    );
    expect(status(r, 'pii')).toBe('fail');
    expect(detail(r, 'pii')).toMatch(/src\/fixture\.json:1 phone/);
  });

  it('fails a real-looking email in a meta file', () => {
    const r = judgeStatic(
      direction('A', { texts: { 'refs.json': '{ "note": "person@gmail.com" }' } }),
      ctx,
    );
    expect(status(r, 'pii')).toBe('fail');
    expect(detail(r, 'pii')).toMatch(/refs\.json:1 email person@gmail\.com/);
  });

  it('fails a denylisted term', () => {
    const r = judgeStatic(
      direction('A', { texts: { 'src/fixture.json': '{ "business": "Alder Bay Plumbing" }' } }),
      { ...ctx, denylist: ['Alder Bay Plumbing'] },
    );
    expect(status(r, 'pii')).toBe('fail');
    expect(detail(r, 'pii')).toMatch(/denylist Alder Bay Plumbing/);
  });

  it('passes the fictional range', () => {
    const r = judgeStatic(
      direction('A', {
        texts: { 'src/fixture.json': '{ "phone": "(312) 555-0142", "email": "ana@example.com" }' },
      }),
      ctx,
    );
    expect(status(r, 'pii')).toBe('pass');
  });
});
