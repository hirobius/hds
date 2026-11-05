/**
 * Seam under test: the /stress screens (hds#520), real app screens built from the
 * public HDS package only. The gate: each screen renders with one h1, its source
 * imports nothing but React and the package's public entry points, writes no raw
 * colour, no px, no inline style and no raw form control, and every gap the build
 * hit is both marked in the source (`GAP:<id>`) and listed in STRESS_GAPS.
 */
import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { StressScreen } from '../../docs-site/components/stress/stress-screen';
import { STRESS_GAPS, STRESS_SCREENS } from '../../docs-site/lib/stress-gaps';

const DIR = join(__dirname, '..', '..', 'docs-site/components/stress');
const files = readdirSync(DIR).filter((f) => f.endsWith('.tsx'));
const sources = files.map((f) => ({ file: f, text: readFileSync(join(DIR, f), 'utf8') }));
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('stress screens', () => {
  it('names three screens: settings, dashboard and inbox', () => {
    expect(STRESS_SCREENS.map((s) => s.id)).toEqual(['settings', 'dashboard', 'inbox']);
  });

  it.each(['settings', 'dashboard', 'inbox'])('renders %s with one h1', (id) => {
    const { container } = render(<StressScreen id={id} />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.textContent?.length).toBeGreaterThan(200);
  });

  it('imports only React and the public package', () => {
    const bad = sources.flatMap(({ file, text }) =>
      [...text.matchAll(/from '([^']+)'/g)]
        .map((m) => m[1])
        .filter(
          (p) =>
            !/^(react|@hirobius\/design-system(\/patterns|\/icons)?|\.\/.*|\.\.\/\.\.\/lib\/stress-gaps)$/.test(
              p,
            ),
        )
        .map((p) => `${file}: ${p}`),
    );
    expect(bad).toEqual([]);
  });

  it('writes no raw colour, px, inline style or raw form control', () => {
    const bad = sources.flatMap(({ file, text }) =>
      code(text)
        .split('\n')
        .filter(
          (l) =>
            /#[0-9a-f]{3,8}\b|\d+px|style=\{|className=/i.test(l) ||
            // lower case only: <Button> is HDS, <button> is not.
            /<(input|button|select|textarea|div|span|h[1-6])[\s>]/.test(l),
        )
        .map((l) => `${file}: ${l.trim()}`),
    );
    expect(bad).toEqual([]);
  });

  it('lists every gap marked in the source, and marks every listed gap', () => {
    const marked = new Set(
      sources.flatMap(({ text }) => [...text.matchAll(/GAP:([a-z0-9-]+)/g)].map((m) => m[1])),
    );
    const listed = new Set(STRESS_GAPS.map((g) => g.id));
    expect(
      [...marked].filter((id) => !listed.has(id)),
      'marked, not listed',
    ).toEqual([]);
    expect(
      [...listed].filter((id) => !marked.has(id)),
      'listed, not marked',
    ).toEqual([]);
    for (const g of STRESS_GAPS) {
      expect(['component', 'prop', 'token']).toContain(g.kind);
      expect(g.title.length).toBeGreaterThan(10);
      for (const s of g.screens) expect(STRESS_SCREENS.map((x) => x.id)).toContain(s);
    }
  });
});
