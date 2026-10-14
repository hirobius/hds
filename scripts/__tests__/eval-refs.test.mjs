/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The design-refs pipeline (eval/refs/README.md): gap logs, clustering with a
 * threshold and the decision history, fidelity maths, scale and blast-radius
 * facts, ref and card validation, proposals, the index and the review board.
 * Pure functions with small hand-built inputs; the last block runs the CLI's
 * --check over the committed eval/refs data, so a bad ref cannot land.
 */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aliasesOf, cssVarFor, tokenExists } from '../lib/refs/blast.mjs';
import { buildReviewBoard } from '../lib/refs/board.mjs';
import { latestDecisions, newBoardDecisions, validateDecisions } from '../lib/refs/decisions.mjs';
import {
  compareImages,
  fidelityFlags,
  paletteSimilarity,
  rubricScore,
} from '../lib/refs/fidelity.mjs';
import { clusterGaps, groupGaps, validateRefGapLog } from '../lib/refs/gaps.mjs';
import { renderIndex } from '../lib/refs/index-md.mjs';
import { benefitSummary, validateProposal } from '../lib/refs/proposal.mjs';
import { validateCard, validateRefMeta } from '../lib/refs/ref.mjs';
import { assessValue, keyConvention, readScale } from '../lib/refs/scale.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const gap = (over = {}) => ({
  ref: '2026-10-14-pricing',
  kind: 'token',
  id: 'section-gap-xl',
  needed: 'About 160px between page sections',
  didInstead: 'Used space.32 (128px), the largest step',
  proposal: 'Add a 160px step to the spacing scale',
  evidence: 'src/App.tsx:12',
  ...over,
});

const decision = (over = {}) => ({
  proposal: 'section-gap-xl',
  decision: 'defer',
  at: '2026-10-15',
  refCount: 3,
  ...over,
});

describe('validateRefGapLog', () => {
  it('accepts an empty log and a full gap', () => {
    expect(validateRefGapLog([], 'r').ok).toBe(true);
    const r = validateRefGapLog(
      [
        gap({
          measured: '~160px',
          nearest: 'space.32 = 128px',
          want: { scale: 'primitive.space', px: 160 },
        }),
      ],
      '2026-10-14-pricing',
    );
    expect(r.problems).toEqual([]);
  });

  it('requires an id, since clustering is by id', () => {
    const { id: _id, ...noId } = gap();
    expect(validateRefGapLog([noId]).problems).toContain('gap 1: missing id');
  });

  it('rejects a gap filed under another ref, a bad kind and a bad want', () => {
    const r = validateRefGapLog(
      [gap({ ref: 'other', kind: 'vibe', want: { scale: 'space', px: -1 } })],
      '2026-10-14-pricing',
    );
    expect(r.problems.join('\n')).toMatch(/does not match the ref/);
    expect(r.problems.join('\n')).toMatch(/kind "vibe"/);
    expect(r.problems.join('\n')).toMatch(/want.scale/);
    expect(r.problems.join('\n')).toMatch(/want.px/);
  });

  it('rejects a log that is not an array', () => {
    expect(validateRefGapLog({}).ok).toBe(false);
  });
});

describe('clusterGaps', () => {
  const three = ['a', 'b', 'c'].map((s) => gap({ ref: `2026-10-1${'abc'.indexOf(s) + 1}-${s}` }));

  it('proposes a gap only once the threshold of distinct refs hit it', () => {
    expect(clusterGaps(three.slice(0, 2), { threshold: 3 }).candidates).toEqual([]);
    expect(clusterGaps(three.slice(0, 2), { threshold: 3 }).logged[0].refCount).toBe(2);
    const c = clusterGaps(three, { threshold: 3 }).candidates;
    expect(c.map((g) => [g.id, g.refCount, g.state])).toEqual([['section-gap-xl', 3, 'new']]);
  });

  it('counts a ref once however often it logs the gap', () => {
    const twice = [three[0], { ...three[0], evidence: 'src/App.tsx:40' }, three[1]];
    const [g] = clusterGaps(twice, { threshold: 2 }).candidates;
    expect(g.refCount).toBe(2);
    expect(g.hits).toBe(3);
  });

  it('never re-proposes a rejected or approved gap', () => {
    const rejected = clusterGaps(three, {
      threshold: 3,
      decisions: [decision({ decision: 'reject', reason: 'we want tighter pages' })],
    });
    expect(rejected.candidates).toEqual([]);
    expect(rejected.suppressed[0]).toMatchObject({
      state: 'rejected',
      reason: 'we want tighter pages',
    });
    const approved = clusterGaps(three, {
      threshold: 3,
      decisions: [decision({ decision: 'approve' })],
    });
    expect(approved.suppressed[0].state).toBe('approved');
  });

  it('brings a deferred gap back only when more refs hit it than at the defer', () => {
    const held = clusterGaps(three, { threshold: 3, decisions: [decision({ refCount: 3 })] });
    expect(held.candidates).toEqual([]);
    expect(held.suppressed[0].state).toBe('deferred');
    const four = [...three, gap({ ref: '2026-10-20-d' })];
    const back = clusterGaps(four, { threshold: 3, decisions: [decision({ refCount: 3 })] });
    expect(back.candidates[0].state).toBe('resurfaced');
  });

  it('uses the newest decision for a gap', () => {
    const c = clusterGaps(three, {
      threshold: 3,
      decisions: [
        decision({ decision: 'reject', reason: 'no' }),
        decision({ decision: 'approve', at: '2026-10-20' }),
      ],
    });
    expect(c.suppressed[0].state).toBe('approved');
  });

  it('flags drift when no evidence ref is an app or dashboard', () => {
    const surfaces = Object.fromEntries(three.map((g) => [g.ref, 'marketing']));
    expect(clusterGaps(three, { threshold: 3, surfaces }).candidates[0].driftRisk).toBe(true);
    surfaces[three[0].ref] = 'dashboard';
    expect(clusterGaps(three, { threshold: 3, surfaces }).candidates[0].driftRisk).toBe(false);
  });

  it('takes the median of the wanted values on one scale', () => {
    const wants = [140, 160, 200].map((px, i) =>
      gap({ ref: `2026-10-1${i}-x`, want: { scale: 'primitive.space', px } }),
    );
    const [g] = groupGaps(wants);
    expect(g.want).toMatchObject({ scale: 'primitive.space', median: 160 });
  });

  it('refuses a threshold that is not a positive whole number', () => {
    expect(() => clusterGaps([], { threshold: 0 })).toThrow(/threshold/);
  });
});

describe('decisions', () => {
  it('validates the history', () => {
    expect(validateDecisions([decision()]).ok).toBe(true);
    const bad = validateDecisions([
      decision({ decision: 'reject' }),
      decision({ pr: 'https://example.com' }),
    ]);
    expect(bad.problems.join('\n')).toMatch(/a reject needs a reason/);
    expect(bad.problems.join('\n')).toMatch(/github.com pull request/);
    expect(validateDecisions({}).ok).toBe(false);
  });

  it('keeps the last decision per proposal', () => {
    const latest = latestDecisions([
      decision(),
      decision({ decision: 'approve', at: '2026-10-16' }),
    ]);
    expect(latest.get('section-gap-xl').decision).toBe('approve');
  });

  it('turns board documents into new history entries once', () => {
    const board = [
      { id: 'section-gap-xl', decision: 'approve', reason: '', decidedAt: '2026-10-16T07:00:00Z' },
    ];
    const first = newBoardDecisions([], board, { 'section-gap-xl': 4 });
    expect(first.entries).toEqual([
      { proposal: 'section-gap-xl', decision: 'approve', at: '2026-10-16', refCount: 4 },
    ]);
    expect(newBoardDecisions(first.entries, board, {}).entries).toEqual([]);
  });

  it('will not record a reject without a reason', () => {
    const r = newBoardDecisions(
      [],
      [{ id: 'x-gap', decision: 'reject', reason: ' ', decidedAt: '2026-10-16' }],
      {},
    );
    expect(r.entries).toEqual([]);
    expect(r.problems[0]).toMatch(/without a reason/);
  });
});

const solid = (width, height, rgb) => {
  const data = new Uint8Array(width * height * 4);
  for (let p = 0; p < width * height; p += 1) data.set([...rgb, 255], p * 4);
  return { width, height, data };
};

const stripes = (width, height, offset = 0) => {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = Math.floor((x + offset) / 4) % 2 ? 0 : 255;
      data.set([v, v, v, 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
};

describe('fidelity', () => {
  it('scores the rubric out of 100', () => {
    expect(rubricScore({ layout: 4, spacing: 4, type: 4, color: 4, components: 4 }).score).toBe(
      100,
    );
    expect(rubricScore({ layout: 2, spacing: 3, type: 1, color: 4, components: 3 }).score).toBe(65);
    expect(rubricScore({ layout: 5 }).ok).toBe(false);
  });

  it('matches an image with itself and tells unlike images apart', () => {
    const a = stripes(32, 32);
    expect(compareImages(a, a)).toMatchObject({ structure: 1, palette: 1 });
    const shifted = compareImages(a, stripes(32, 32, 4));
    expect(shifted.structure).toBeLessThan(0.2);
    expect(paletteSimilarity(solid(8, 8, [255, 255, 255]), solid(8, 8, [0, 0, 0]))).toBe(0);
  });

  it('compares the shared top of two heights and refuses two widths', () => {
    expect(compareImages(stripes(32, 64), stripes(32, 32)).comparedHeight).toBe(32);
    expect(() => compareImages(stripes(32, 32), stripes(16, 32))).toThrow(/one width/);
  });

  it('flags a score the measured pair does not support', () => {
    expect(fidelityFlags({ score: 90, structure: 0.1, palette: 0.9 })).toHaveLength(1);
    expect(fidelityFlags({ score: 90, structure: 0.6, palette: 0.1 })[0]).toMatch(/rubric.color/);
    expect(fidelityFlags({ score: 60, structure: 0.5, palette: 0.5 })).toEqual([]);
  });
});

const px = (value) => ({ $value: { value, unit: 'px' } });
const TOKENS = {
  primitive: {
    space: {
      $type: 'dimension',
      0: px(0),
      1: px(4),
      2: px(8),
      4: px(16),
      8: px(32),
      24: px(96),
      32: px(128),
      px1: px(1),
    },
  },
  semantic: {
    space: {
      section: {
        hero: { $value: '{primitive.space.32}' },
        big: { $value: '{semantic.space.section.hero}' },
      },
    },
  },
};

describe('scale', () => {
  const steps = readScale(TOKENS, 'primitive.space');

  it('reads px steps in order and finds the key convention', () => {
    expect(steps.map((s) => s.px)).toEqual([0, 1, 4, 8, 16, 32, 96, 128]);
    expect(keyConvention(steps)).toBe(4);
    expect(readScale(TOKENS, 'primitive.nothing')).toEqual([]);
  });

  it('calls an on-grid extension past the top low risk and names its key', () => {
    expect(assessValue(steps, 160)).toMatchObject({
      position: 'beyond-max',
      px: 160,
      suggestedKey: '40',
      risk: 'low',
    });
  });

  it('flags a value inside the scale, a near-duplicate and an existing step', () => {
    expect(assessValue(steps, 64)).toMatchObject({ position: 'between', risk: 'medium' });
    expect(assessValue(steps, 124)).toMatchObject({ risk: 'high' });
    expect(assessValue(steps, 96)).toMatchObject({ position: 'exists', key: '24' });
  });

  it('snaps an off-grid value and says so', () => {
    const a = assessValue(steps, 158);
    expect(a.px).toBe(160);
    expect(a.notes.join(' ')).toMatch(/off the 4px grid/);
  });
});

describe('blast radius', () => {
  it('maps a token path to its CSS variable', () => {
    expect(cssVarFor('semantic.accent.contentHover')).toBe('--semantic-accent-contentHover');
  });

  it('finds aliases transitively', () => {
    expect(aliasesOf(TOKENS, 'primitive.space.32')).toEqual([
      'semantic.space.section.big',
      'semantic.space.section.hero',
    ]);
    expect(tokenExists(TOKENS, 'primitive.space.32')).toBe(true);
    expect(tokenExists(TOKENS, 'primitive.space.40')).toBe(false);
  });
});

const META = {
  id: '2026-10-14-pricing',
  title: 'Pricing cards',
  surface: 'marketing',
  viewport: 1280,
  theme: 'light',
  source: { drive: { fileId: 'abc', name: 'IMG_1.PNG' }, addedAt: '2026-10-14' },
  fidelity: { rubric: { layout: 3, spacing: 2, type: 2, color: 3, components: 3 }, score: 65 },
};

describe('ref meta and card', () => {
  it('accepts a valid ref.json', () => {
    expect(validateRefMeta(META, '2026-10-14-pricing')).toEqual([]);
  });

  it('holds the score to what the rubric adds up to', () => {
    const p = validateRefMeta({ ...META, fidelity: { ...META.fidelity, score: 90 } }, META.id);
    expect(p.join('\n')).toMatch(/adds up to 65/);
  });

  it('checks the id, the date, the surface and the viewport', () => {
    const p = validateRefMeta({ ...META, surface: 'poster', viewport: 800 }, '2026-10-15-pricing');
    expect(p.join('\n')).toMatch(/must match its directory/);
    expect(p.join('\n')).toMatch(/must match the date/);
    expect(p.join('\n')).toMatch(/surface/);
    expect(p.join('\n')).toMatch(/viewport/);
  });

  const card = [
    '# Pricing cards',
    '',
    '## What works',
    '- Card grid and type ramp',
    '## Closest tokens',
    '- Section padding: semantic.space.section.hero',
    '## Gaps',
    '- `section-gap-xl`: needed ~160px',
  ].join('\n');

  it('accepts a card that names every gap', () => {
    expect(validateCard(card, ['section-gap-xl'])).toEqual([]);
  });

  it('rejects a card missing a gap, out of order, with an image or an empty bullet', () => {
    expect(validateCard(card, ['section-gap-xl', 'stat-tile']).join('\n')).toMatch(/stat-tile/);
    expect(
      validateCard(card.replace('## What works', '## Works'), ['section-gap-xl']).join('\n'),
    ).toMatch(/sections must be/);
    expect(validateCard(`${card}\n![x](y.png)`, ['section-gap-xl']).join('\n')).toMatch(
      /text only/,
    );
    expect(validateCard(`${card}\n- `, ['section-gap-xl']).join('\n')).toMatch(/empty bullet/);
  });
});

const proposal = (over = {}) => ({
  id: 'section-gap-xl',
  title: 'Add a 160px spacing step',
  kind: 'token',
  createdAt: '2026-10-20',
  change: {
    summary: 'Add primitive.space.40 = 160px',
    diff: '+ "40": { "$value": { "value": 160, "unit": "px" } }',
    tokens: [{ path: 'primitive.space.40', action: 'add', to: '160px' }],
  },
  evidence: { refs: ['r-a', 'r-b', 'r-c'] },
  blastRadius: {
    level: 'none',
    summary: 'Additive',
    components: [],
    files: 0,
    visualDiff: 'none: additive',
  },
  consistencyRisk: { level: 'low', summary: 'Extends the scale past 128 on the 4px grid' },
  benefit: {
    perRef: [
      { ref: 'r-a', before: 60, after: 70 },
      { ref: 'r-b', before: 50, after: 60 },
      { ref: 'r-c', before: 55, after: null },
    ],
    summary: 'Section rhythm matches',
  },
  recommendation: 'adopt',
  rationale: 'Three refs want roomier sections than 128px allows.',
  ...over,
});
const ctx = {
  id: 'section-gap-xl',
  candidate: { refs: ['r-a', 'r-b', 'r-c'] },
  threshold: 3,
  refIds: ['r-a', 'r-b', 'r-c'],
};

describe('validateProposal', () => {
  it('accepts a complete proposal', () => {
    expect(validateProposal(proposal(), ctx)).toEqual([]);
  });

  it('needs enough evidence that logged the gap, and a row per ref', () => {
    const p = validateProposal(
      proposal({ evidence: { refs: ['r-a', 'r-z'] }, benefit: { perRef: [], summary: 's' } }),
      { ...ctx, refIds: [...ctx.refIds, 'r-z'] },
    );
    expect(p.join('\n')).toMatch(/needs 3 or more distinct refs/);
    expect(p.join('\n')).toMatch(/did not log the gap/);
    expect(p.join('\n')).toMatch(/no row for evidence ref r-a/);
  });

  it('refuses a proposal with no candidate behind it', () => {
    expect(validateProposal(proposal(), { ...ctx, candidate: null }).join('\n')).toMatch(
      /no current candidate/,
    );
  });

  it('asks a modify to say the current value and an adopt-modified to say what it modifies', () => {
    const p = validateProposal(
      proposal({
        recommendation: 'adopt-modified',
        change: {
          summary: 's',
          diff: 'd',
          tokens: [{ path: 'primitive.space.32', action: 'modify', to: '160px' }],
        },
      }),
      ctx,
    );
    expect(p.join('\n')).toMatch(/from must say the current value/);
    expect(p.join('\n')).toMatch(/says what it modifies/);
  });

  it('sums the benefit over the refs that have both scores', () => {
    expect(benefitSummary(proposal().benefit.perRef)).toEqual({
      before: 55,
      after: 65,
      gain: 10,
      measured: 2,
    });
    expect(benefitSummary([]).gain).toBeNull();
  });
});

describe('renderIndex', () => {
  const rows = [
    {
      id: '2026-10-14-pricing',
      meta: META,
      gapIds: ['section-gap-xl'],
      card: '# Pricing cards\n\n## Gaps\n- `section-gap-xl`',
    },
  ];
  const clusters = {
    candidates: [],
    suppressed: [],
    logged: [{ id: 'section-gap-xl', kind: 'token', refCount: 1, state: 'logged' }],
  };

  it('lists refs, gaps and cards, and says when there are none', () => {
    const text = renderIndex(rows, clusters, { threshold: 3 });
    expect(text).toMatch(
      /\| \[`2026-10-14-pricing`\]\(refs\/2026-10-14-pricing\/card.md\) \| Pricing cards \| marketing \| 1280 light \| 65\/100 \|/,
    );
    expect(text).toMatch(/\| `section-gap-xl` \| token \| 1 \| logged \|/);
    expect(text).toMatch(/### Pricing cards/);
    expect(
      renderIndex([], { candidates: [], suppressed: [], logged: [] }, { threshold: 3 }),
    ).toMatch(/No refs yet/);
  });
});

describe('buildReviewBoard', () => {
  const base = { generatedAt: '2026-10-20', threshold: 3, refTotal: 5, decided: [], logged: [] };

  it('shows one card per proposal with its decision controls, escaping text', () => {
    const page = buildReviewBoard({
      ...base,
      proposals: [
        {
          proposal: proposal({ title: 'Add <b>160px</b>' }),
          candidate: { state: 'new', driftRisk: true },
          images: {},
          refMeta: {},
        },
      ],
    });
    expect(page.startsWith('<title>Design Refs Review</title>')).toBe(true);
    expect(page).toContain('data-prop="section-gap-xl"');
    expect(page).toContain('Add &lt;b&gt;160px&lt;/b&gt;');
    expect(page).toContain('data-decide="approve"');
    expect(page).toContain('Evidence is not app or dashboard UI');
    expect(page).toContain('55 → 65 (+10)');
    expect(page).toContain('Original: not captured');
  });

  it('shows an empty state and the decided list', () => {
    const page = buildReviewBoard({
      ...base,
      proposals: [],
      decided: [
        {
          proposal: 'radius-xl',
          decision: 'reject',
          at: '2026-10-18',
          reason: 'Keep corners tight',
        },
      ],
    });
    expect(page).toContain('Nothing to review');
    expect(page).toContain('Keep corners tight');
  });
});

describe('committed eval/refs data', () => {
  it('passes eval-refs --check', () => {
    const r = spawnSync(process.execPath, ['scripts/eval-refs.mjs', '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(r.stdout + r.stderr).toMatch(/RESULT: PASS/);
    expect(r.status).toBe(0);
  });
});
