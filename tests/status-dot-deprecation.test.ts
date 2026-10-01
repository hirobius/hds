// @vitest-environment node
/**
 * hds#395 (B5): StatusDot is deprecated for Badge `dot` and removed in 0.21.0
 * (ADR-014). It is not removed in 0.20.0 with the rest of the prune: ops passes
 * it `style` (src/app/pages/ops/audit/FleetAuditPage.tsx), Badge takes no
 * `style` (className-only), so no codemod can rewrite that site and ops moves
 * the style first. The deprecation reaches the manifest, leaves the consumer
 * surfaces, and MIGRATIONS.md says what ops does first.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('StatusDot deprecation (hds#395)', () => {
  const spec = JSON.parse(read('public/hds-manifest.json')).componentSpecs.StatusDot;

  it('the manifest records it with Badge dot as the survivor and 0.21.0 as the removal', () => {
    expect(spec, 'StatusDot has no spec').toBeDefined();
    expect(spec.deprecated).toMatch(/<Badge dot>/);
    expect(spec.removeIn).toBe('0.21.0');
    expect(spec.useInstead).toBe('Badge');
  });

  it('StatusDot and StatusDotProps both carry @deprecated (naming Badge) and @removeIn 0.21.0', () => {
    const file = 'src/app/components/status-dot.tsx';
    const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
    /** The JSDoc tags on the declaration of `name`, by tag name. */
    const tagsOf = (name: string) => {
      const tags: Record<string, string> = {};
      for (const statement of source.statements) {
        const decl = ts.isInterfaceDeclaration(statement)
          ? statement
          : ts.isVariableStatement(statement)
            ? statement.declarationList.declarations[0]
            : undefined;
        if (!decl?.name || !ts.isIdentifier(decl.name) || decl.name.text !== name) continue;
        for (const tag of ts.getJSDocTags(decl))
          tags[tag.tagName.text] = ts.getTextOfJSDocComment(tag.comment) ?? '';
      }
      return tags;
    };
    for (const [name, survivor] of [
      ['StatusDot', '<Badge dot>'],
      ['StatusDotProps', 'BadgeProps'],
    ] as const) {
      const tags = tagsOf(name);
      expect(tags.deprecated, name).toContain(survivor);
      expect(tags.removeIn, name).toBe('0.21.0');
    }
  });

  it('the consumer skill and llms.txt no longer offer it', () => {
    for (const file of ['skills/hds-consumer/SKILL.md', 'public/llms.txt', 'llms.txt'])
      expect(read(file), file).not.toMatch(/^- `StatusDot`|^StatusDot:/m);
  });

  it('MIGRATIONS.md maps it to Badge dot and says ops moves its style first', () => {
    const text = read('MIGRATIONS.md');
    const start = text.indexOf('### StatusDot is deprecated');
    expect(start).toBeGreaterThan(-1);
    const section = text.slice(start, text.indexOf('\n### ', start + 1));
    expect(section).toContain('0.21.0');
    expect(section).toContain('<Badge dot');
    expect(section).toMatch(/style=\{/);
    expect(section).toMatch(/wrapper/);
    expect(section).toMatch(/className/);
    expect(section).toContain('FleetAuditPage.tsx');
  });
});
