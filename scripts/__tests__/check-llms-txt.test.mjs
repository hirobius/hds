/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLlmsTxt } from '../check-llms-txt.mjs';
import { LLMS_BASE_URL } from '../lib/llms-index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rules = (text) => checkLlmsTxt(text, { root: ROOT }).map((v) => v.rule);
const good = (extra = '') =>
  `# Title\n\n> A summary line.\n\n## Docs\n\n- [DESIGN.md](${LLMS_BASE_URL}/DESIGN.md): spec\n${extra}`;

describe('checkLlmsTxt', () => {
  it('passes a conformant index', () => {
    expect(rules(good())).toEqual([]);
  });

  it('passes the committed public/llms.txt', () => {
    expect(rules(readFileSync(join(ROOT, 'public/llms.txt'), 'utf8'))).toEqual([]);
  });

  it('fails without an H1', () => {
    expect(rules(good().replace('# Title', 'Title'))).toContain('NO_H1');
  });

  it('fails without a > summary right after the H1', () => {
    expect(rules(good().replace('> A summary line.', 'A summary line.'))).toContain('NO_SUMMARY');
  });

  it('fails a relative link', () => {
    expect(rules(good('- [x](public/llms-full.txt): y\n'))).toContain('LINK_NOT_ABSOLUTE');
  });

  it('fails an absolute link on another host', () => {
    expect(rules(good('- [x](https://example.com/DESIGN.md): y\n'))).toContain('LINK_OFF_BASE');
  });

  it('fails a link to a file that does not exist', () => {
    expect(rules(good(`- [x](${LLMS_BASE_URL}/NOPE.md): y\n`))).toContain('LINK_MISSING_FILE');
  });

  it('fails a link to a file the package does not ship', () => {
    expect(rules(good(`- [x](${LLMS_BASE_URL}/package.json.bak): y\n`)).length).toBeGreaterThan(0);
    expect(rules(good(`- [x](${LLMS_BASE_URL}/pnpm-lock.yaml): y\n`))).toContain(
      'LINK_NOT_IN_PACKAGE',
    );
  });

  it('fails a timestamp', () => {
    expect(rules(good('Generated: 2026-10-11T20:46:31.293Z\n'))).toContain('TIMESTAMP');
  });
});

describe('gate CLI in fixture mode', () => {
  const run = (rel) => {
    try {
      execFileSync('node', ['scripts/check-llms-txt.mjs', '--fixture-mode'], {
        cwd: ROOT,
        env: { ...process.env, FIXTURE_FILE: join(ROOT, rel) },
        stdio: 'pipe',
      });
      return 0;
    } catch (e) {
      return e.status;
    }
  };
  it('passes the passing fixture and fails the violating one', () => {
    expect(run('fixtures/check-llms-txt/passing.example.txt')).toBe(0);
    expect(run('fixtures/check-llms-txt/violating.example.txt')).toBe(1);
  });
});
