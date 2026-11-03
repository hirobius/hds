/**
 * Tests for scripts/mutate.mjs (hds#1089): the diff-scoped Stryker wrapper.
 * The wrapper's own logic — which files are worth mutating, how the diff is
 * resolved, how a report is summarized — is what can silently scope a run to
 * nothing, so it is pinned here. Stryker itself is not run in this suite.
 */
import { describe, expect, it } from 'vitest';
import {
  buildStrykerArgs,
  diffFiles,
  formatSummary,
  isMutatable,
  parseArgs,
  summarizeReport,
} from '../mutate.mjs';

describe('isMutatable', () => {
  it.each([
    ['codemods/lib/semver.mjs', true],
    ['scripts/lib/gate-tier.mjs', true],
    ['src/lib/utils.ts', true],
    ['src/plain.js', true],
    // tests judge the mutants; they are not mutated themselves
    ['scripts/__tests__/semver.test.mjs', false],
    ['src/lib/utils.test.ts', false],
    ['src/widget.spec.tsx', false],
    // each exclusion rule isolated, so one rule's mutant cannot hide behind
    // another rule catching the same file (the first self-run's survivors)
    ['scripts/__tests__/helper.mjs', false],
    ['src/__fixtures__/sample.mjs', false],
    ['codemods/lib/check.spec.mjs', false],
    ['src/lib/widget.test.mjs', false],
    // UI is out of scope: slow, low signal per mutant
    ['src/app/components/Button.tsx', false],
    ['src/lib/types.d.ts', false],
    // not source at all
    ['docs/mutation-testing.md', false],
    ['dist/hirobius-ui.js', false],
    ['node_modules/pkg/index.js', false],
    ['pnpm-lock.yaml', false],
  ])('%s -> %s', (file, expected) => {
    expect(isMutatable(file)).toBe(expected);
  });
});

describe('parseArgs', () => {
  it('treats positional arguments as the file set', () => {
    expect(parseArgs(['codemods/lib/semver.mjs', 'scripts/lib/x.mjs'])).toEqual({
      files: ['codemods/lib/semver.mjs', 'scripts/lib/x.mjs'],
      diff: false,
      base: 'origin/main',
      help: false,
    });
  });

  it('defaults to the diff when no files are named', () => {
    expect(parseArgs([]).diff).toBe(true);
    expect(parseArgs(['--diff']).diff).toBe(true);
  });

  it('reads --base as a pair and as --base=<ref>, and files win over --diff', () => {
    expect(parseArgs(['--diff', '--base', 'main']).base).toBe('main');
    const parsed = parseArgs(['--base=release', 'a.mjs']);
    expect(parsed.base).toBe('release');
    expect(parsed.diff).toBe(false);
  });
});

describe('diffFiles', () => {
  it('unions committed, working-tree and untracked changes, filtered and sorted', () => {
    const outputs = [
      'codemods/lib/semver.mjs\nsrc/lib/utils.ts\nREADME.md\n',
      'scripts/mutate.mjs\ncodemods/lib/semver.mjs\n',
      'src/app/components/Button.tsx\nnew-file.mjs\n',
    ];
    const exec = () => ({ status: 0, stdout: outputs.shift(), stderr: '' });
    expect(diffFiles('origin/main', exec)).toEqual([
      'codemods/lib/semver.mjs',
      'new-file.mjs',
      'scripts/mutate.mjs',
      'src/lib/utils.ts',
    ]);
  });

  it('throws with the git error when a git call fails', () => {
    const exec = () => ({ status: 128, stdout: '', stderr: 'fatal: bad revision' });
    expect(() => diffFiles('nope', exec)).toThrow(/bad revision/);
  });
});

describe('buildStrykerArgs', () => {
  it('passes the file set as one --mutate list', () => {
    expect(buildStrykerArgs(['a.mjs', 'b.ts'])).toEqual(['run', '--mutate', 'a.mjs,b.ts']);
  });
});

describe('summarizeReport', () => {
  const report = {
    files: {
      'a.mjs': {
        mutants: [
          {
            status: 'Killed',
            mutatorName: 'BinaryOperator',
            replacement: '-',
            location: { start: { line: 3 } },
          },
          {
            status: 'Timeout',
            mutatorName: 'BlockStatement',
            replacement: '{}',
            location: { start: { line: 5 } },
          },
          {
            status: 'Survived',
            mutatorName: 'ConditionalExpression',
            replacement: 'false',
            location: { start: { line: 7 } },
          },
          {
            status: 'NoCoverage',
            mutatorName: 'StringLiteral',
            replacement: '""',
            location: { start: { line: 9 } },
          },
          {
            status: 'CompileError',
            mutatorName: 'x',
            replacement: 'y',
            location: { start: { line: 11 } },
          },
        ],
      },
    },
  };

  it('scores detected over detectable and lists only true survivors', () => {
    const summary = summarizeReport(report);
    expect(summary).toMatchObject({ detected: 2, undetected: 2, total: 4, score: 50 });
    expect(summary.survivors).toEqual([
      { file: 'a.mjs', line: 7, mutator: 'ConditionalExpression', replacement: 'false' },
    ]);
  });

  it('reports a null score when there is nothing to detect', () => {
    expect(summarizeReport({ files: {} }).score).toBeNull();
    expect(formatSummary(summarizeReport({ files: {} }))).toContain('n/a');
  });

  it('formats the score and each survivor for a reviewer', () => {
    const text = formatSummary(summarizeReport(report));
    expect(text).toContain('50%');
    expect(text).toContain('a.mjs:7');
    expect(text).toContain('ConditionalExpression');
  });
});
