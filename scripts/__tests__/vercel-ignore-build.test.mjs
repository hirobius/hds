import { describe, it, expect } from 'vitest';
import { shouldBuild } from '../vercel-ignore-build.mjs';

const prod = { VERCEL_ENV: 'production', VERCEL_GIT_PREVIOUS_SHA: 'abc' };

describe('vercel-ignore-build', () => {
  it('skips preview builds unless the commit asks for one', () => {
    expect(shouldBuild({ VERCEL_ENV: 'preview' }, ['src/a.ts']).build).toBe(false);
    const asked = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_MESSAGE: 'fix: x [preview]' };
    expect(shouldBuild(asked, ['src/a.ts']).build).toBe(true);
  });

  it('builds production when the previous deploy is unknown', () => {
    expect(shouldBuild({ VERCEL_ENV: 'production' }, null).build).toBe(true);
    expect(shouldBuild(prod, null).build).toBe(true);
  });

  it('skips production when only notes and agent files changed', () => {
    const changed = [
      'docs/ai/HANDOFF.md',
      'status.json',
      '.status/x.md',
      '.claude/skills/a/SKILL.md',
      'scripts/__tests__/a.test.mjs',
    ];
    expect(shouldBuild(prod, changed).build).toBe(false);
  });

  it('builds production when app code or bundled data changed', () => {
    expect(shouldBuild(prod, ['README.md', 'src/app/components/button.tsx']).build).toBe(true);
    expect(shouldBuild(prod, ['content/docs/index.mdx']).build).toBe(true);
    expect(shouldBuild(prod, ['hirobius.tokens.json']).build).toBe(true);
  });

  it('builds when a published agent-context file changed', () => {
    expect(shouldBuild(prod, ['DESIGN.md']).build).toBe(true);
    expect(shouldBuild(prod, ['docs/CONSUMING.md']).build).toBe(true);
  });

  it('builds a production redeploy with no file changes', () => {
    expect(shouldBuild(prod, []).build).toBe(true);
  });
});
