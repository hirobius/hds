/**
 * tests/check-source-canon.test.ts
 *
 * Fixture tests for scripts/check-source-canon.mjs rule detection.
 * These validate that new rules are correctly wired and will catch violations.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('check-source-canon: DATA_TENANT rule', () => {
  it('should flag [data-tenant=] selectors in component CSS', () => {
    // Create a test fixture with a data-tenant selector
    const fixtureDir = path.join(ROOT, 'src/app/components');
    const fixturePath = path.join(fixtureDir, '__test-data-tenant-fixture.tsx');
    const content = `
import React from 'react';

export function TestComponent() {
  return <div className="test">Test</div>;
}

/* Violating style: [data-tenant=bilingual] .nested { color: red; } */
`;

    fs.writeFileSync(fixturePath, content, 'utf8');

    try {
      // The validator exits non-zero when it finds a violation, so execSync
      // throws — capture stdout/stderr from the thrown error.
      let output = '';
      try {
        output = execSync(`node ${path.join(ROOT, 'scripts/check-source-canon.mjs')}`, {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (err: any) {
        output = (err.stdout || '') + (err.stderr || '');
      }

      // The validator should flag the DATA_TENANT violation in the fixture.
      expect(output).toContain('DATA_TENANT');
      expect(output).toContain('data-tenant=');
    } finally {
      // Clean up fixture
      if (fs.existsSync(fixturePath)) {
        fs.unlinkSync(fixturePath);
      }
    }
  });

  it('should NOT flag [data-tenant=] selectors in src/styles/tokens.css', () => {
    // Verify that tokens.css is exempt by checking the validator logic
    // (The file itself should have DATA_TENANT selectors as the source of truth)
    const tokensCssPath = path.join(ROOT, 'src/styles/tokens.css');
    expect(fs.existsSync(tokensCssPath)).toBe(true);

    // The validator may exit non-zero for unrelated violations, so capture
    // output via try/catch rather than relying on a zero exit.
    let output = '';
    try {
      output = execSync(`node ${path.join(ROOT, 'scripts/check-source-canon.mjs')} --verbose`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (err: any) {
      output = (err.stdout || '') + (err.stderr || '');
    }

    // tokens.css is the exempt source of truth for tenant overrides: it may
    // contain [data-tenant=] selectors but must never be flagged for DATA_TENANT.
    expect(output).not.toMatch(/tokens\.css:\d+\s+\[DATA_TENANT\]/);
  });
});
