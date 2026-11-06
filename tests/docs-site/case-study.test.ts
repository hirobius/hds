/**
 * Seam under test: `caseStudyFacts(sources)`, the build-time numbers behind the
 * case study page (hds#1148). Every number on that page comes from a repo file,
 * never from prose, so the story cannot drift from the code. Expected values
 * below are worked examples, not recomputed from the code.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { caseStudyFacts } from '../../docs-site/lib/case-study';

const ROOT = join(__dirname, '..', '..');

const sources = {
  stats: {
    version: '0.9.0',
    components: { core: 4, patterns: 2 },
    tokens: { total: 120 },
    consumers: { productApps: 2, tokenLevelSites: 3 },
  },
  registry: {
    gates: [
      { id: 'a', gateScript: 'scripts/check-a.mjs', firingChannel: 'pre-commit' },
      { id: 'b', gateScript: 'scripts/check-b.mjs', firingChannel: 'pre-commit' },
      { id: 'c', gateScript: 'scripts/check-c.mjs', firingChannel: 'pre-push' },
      { id: 'd', gateScript: 'scripts/check-d.mjs', firingChannel: 'manual' },
      // In the pretest lane (and pre-commit): counted once.
      { id: 'e', gateScript: 'scripts/check-e.mjs', firingChannel: 'pnpm-meta' },
      // In check:fast with a flag.
      { id: 'f', gateScript: 'scripts/check-f.mjs', firingChannel: 'pnpm-meta' },
      // Only in a lane no hook runs.
      { id: 'g', gateScript: 'scripts/check-g.mjs', firingChannel: 'pnpm-meta' },
      // No script, no hook channel.
      { id: 'h', gateScript: null, firingChannel: 'on-demand' },
      // Name is a prefix of a lane command's script, not the same script.
      { id: 'i', gateScript: 'scripts/check-e', firingChannel: 'on-demand' },
    ],
    lanes: {
      'pre-push': [{ run: 'node scripts/check-a.mjs' }],
      pretest: ['node scripts/check-e.mjs', 'node scripts/check-a.mjs'],
      'check:fast': ['node scripts/check-f.mjs --strict', 'pnpm typecheck'],
      'check:full': ['node scripts/check-g.mjs'],
    },
  },
  adrFiles: ['001-a.md', '002-b.md', 'README.md', 'template.md'],
  changelog: '# Changelog\n\n## 0.9.0\n\n- x\n\n## 0.8.1\n\n### Patch\n\n## 0.8.0\n',
};

describe('caseStudyFacts', () => {
  it('reads component, token and consumer counts from the stats file', () => {
    const f = caseStudyFacts(sources);
    expect(f.version).toBe('0.9.0');
    expect(f.coreComponents).toBe(4);
    expect(f.patterns).toBe(2);
    expect(f.tokens).toBe(120);
    expect(f.productApps).toBe(2);
    expect(f.tokenSites).toBe(3);
  });

  it('counts registered gates and the ones git hooks run, each gate once', () => {
    const f = caseStudyFacts(sources);
    expect(f.gates).toBe(9);
    // a, b, c by channel; e by pretest; f by check:fast. Not d, g, h or i.
    expect(f.hookGates).toBe(5);
  });

  it('pins the hook-run count against the real registry', () => {
    const registry = JSON.parse(
      readFileSync(join(ROOT, 'docs', 'guardrails', 'registry.json'), 'utf8'),
    ) as typeof sources.registry;
    const byChannel = registry.gates.filter((g) =>
      ['pre-commit', 'pre-push'].includes(g.firingChannel),
    ).length;
    const f = caseStudyFacts({ ...sources, registry });
    expect(f.hookGates).toBeGreaterThan(byChannel);
    expect(f.hookGates).toBeLessThanOrEqual(registry.gates.length);
  });

  it('counts only numbered decision records', () => {
    expect(caseStudyFacts(sources).decisions).toBe(2);
  });

  it('counts released versions as level-2 version headings in the changelog', () => {
    expect(caseStudyFacts(sources).releases).toBe(3);
  });
});

describe('the case study page', () => {
  const page = readFileSync(join(ROOT, 'content', 'docs', 'case-study.mdx'), 'utf8');

  it('renders its numbers from the repo, through <CaseStudyFacts />', () => {
    expect(page).toMatch(/<CaseStudyFacts \/>/);
  });

  it('sits in the About HDS group of the docs nav', () => {
    const meta = JSON.parse(readFileSync(join(ROOT, 'content', 'docs', 'meta.json'), 'utf8')) as {
      pages: string[];
    };
    const group = meta.pages.indexOf('---About HDS---');
    expect(meta.pages.indexOf('case-study')).toBeGreaterThan(group);
  });
});
