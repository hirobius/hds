/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#483: a deprecated Figma text style (typography/eyebrow) must never be
 * applied again, and designers must see it is deprecated. The data comes from
 * the tokens' `$deprecated` notes, never a hand list.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  deprecatedTextStyles,
  deprecatedStyleDescription,
  assertLiveTextStyle,
  hdsApplyTextStyle,
  textStyleScript,
  deprecatedUsageTargets,
  deprecatedUsageScript,
  hdsAuditDeprecatedUsage,
} from '../lib/figma-deprecated-styles.mjs';
import { docTextFitScript } from '../lib/figma-doc-text-fit.mjs';
import { buildFigmaModel } from '../lib/figma-model.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const tree = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));
const snapshot = JSON.parse(readFileSync(join(ROOT, 'figma', 'snapshot.json'), 'utf8')).snapshot;

describe('deprecatedTextStyles (from $deprecated)', () => {
  const styles = deprecatedTextStyles(tree);
  it('derives eyebrow -> caption and h1/h2/h3 -> title', () => {
    const by = Object.fromEntries(styles.map((s) => [s.style, s.replacementStyle]));
    expect(by).toEqual({
      'typography/eyebrow': 'typography/caption',
      'typography/h1': 'typography/title',
      'typography/h2': 'typography/title',
      'typography/h3': 'typography/title',
    });
  });
  it('the description designers see names version, issue and replacement', () => {
    const eyebrow = styles.find((s) => s.style === 'typography/eyebrow');
    expect(deprecatedStyleDescription(eyebrow)).toBe(
      'Deprecated. Will be removed in 1.0.0 (hds#483). Use typography/caption.',
    );
  });
});

describe('the model marks deprecated text styles', () => {
  it('typography/eyebrow description starts with the deprecation line', () => {
    const model = buildFigmaModel(tree);
    const eyebrow = model.textStyles.find((s) => s.name === 'typography/eyebrow');
    expect(
      eyebrow.description.startsWith(
        'Deprecated. Will be removed in 1.0.0 (hds#483). Use typography/caption.',
      ),
    ).toBe(true);
    const caption = model.textStyles.find((s) => s.name === 'typography/caption');
    expect(caption.description.startsWith('Deprecated')).toBe(false);
  });
});

describe('applying a text style refuses a deprecated one', () => {
  const names = deprecatedTextStyles(tree).map((s) => s.style);
  it('assertLiveTextStyle throws with the replacement', () => {
    expect(() => assertLiveTextStyle('typography/eyebrow', deprecatedTextStyles(tree))).toThrow(
      /typography\/eyebrow is deprecated.*typography\/caption/,
    );
    expect(() =>
      assertLiveTextStyle('typography/caption', deprecatedTextStyles(tree)),
    ).not.toThrow();
  });
  it('textStyleScript refuses to build a script that applies one', () => {
    expect(() => textStyleScript([{ id: '1:2', style: 'typography/eyebrow' }], tree)).toThrow(
      /deprecated/,
    );
    const code = textStyleScript([{ id: '1:2', style: 'typography/caption' }], tree);
    expect(code).toContain('typography/eyebrow');
    expect(code).toContain('hdsApplyTextStyle');
  });
  it('the runtime guard refuses in Figma too', async () => {
    const node = { id: '1:2', setTextStyleIdAsync: async () => {} };
    await expect(
      hdsApplyTextStyle(node, { id: 'S:x', name: 'typography/eyebrow' }, names),
    ).rejects.toThrow(/deprecated/);
    let set = null;
    node.setTextStyleIdAsync = async (id) => (set = id);
    await hdsApplyTextStyle(node, { id: 'S:c', name: 'typography/caption' }, names);
    expect(set).toBe('S:c');
  });
  it('docTextFitScript carries the guard', () => {
    expect(docTextFitScript(['1:1'])).toContain('typography/eyebrow');
  });
});

describe('deprecated usage audit', () => {
  it('targets come from the snapshot ids of deprecated styles and variables', () => {
    const t = deprecatedUsageTargets(tree, snapshot);
    expect(t.styles.map((s) => s.name)).toContain('typography/eyebrow');
    expect(t.variables.some((v) => v.path === 'semantic.typography.eyebrow.font-size')).toBe(true);
    expect(t.variables.some((v) => v.path === 'component.badge.text')).toBe(true);
    expect(t.variables.some((v) => v.path === 'component.badge.neutral.text')).toBe(false);
  });
  it('finds styled segments and bound variables, skipping Archive and Deprecated pages', () => {
    const targets = {
      styles: [{ id: 'S:e', name: 'typography/eyebrow' }],
      variables: [{ id: 'V:1', name: 'badge/text' }],
    };
    const pages = [
      {
        name: 'AppShell',
        children: [
          {
            id: '1',
            type: 'TEXT',
            name: 'a',
            textStyleId: 'S:e',
            characters: 'x',
            boundVariables: { fontSize: [{ type: 'VARIABLE_ALIAS', id: 'V:1' }] },
          },
          {
            id: '2',
            type: 'TEXT',
            name: 'b',
            textStyleId: 'mixed',
            characters: 'xy',
            segments: [{ textStyleId: 'S:c' }, { textStyleId: 'S:e' }],
          },
          {
            id: '3',
            type: 'RECTANGLE',
            name: 'r',
            boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'V:1' }] },
          },
          { id: '4', type: 'TEXT', name: 'ok', textStyleId: 'S:c', characters: 'x' },
        ],
      },
      {
        name: 'Archive',
        children: [{ id: '9', type: 'TEXT', name: 'z', textStyleId: 'S:e', characters: 'x' }],
      },
      {
        name: 'Archive / Deprecated',
        children: [{ id: '7', type: 'TEXT', name: 'z', textStyleId: 'S:e', characters: 'x' }],
      },
      {
        name: 'Deprecated',
        children: [{ id: '8', type: 'TEXT', name: 'z', textStyleId: 'S:e', characters: 'x' }],
      },
    ];
    const hits = hdsAuditDeprecatedUsage(pages, targets, {
      mixed: 'mixed',
      segments: (n) => n.segments,
      all: (page) => page.children,
    });
    expect(hits.map((h) => h.id)).toEqual(['1', '2', '3']);
    expect(hits[0]).toMatchObject({
      page: 'AppShell',
      kind: 'textStyle',
      target: 'typography/eyebrow',
    });
    expect(hits[2]).toMatchObject({ kind: 'variable', target: 'badge/text' });
  });
  it('deprecatedUsageScript is a read-only script', () => {
    const code = deprecatedUsageScript(deprecatedUsageTargets(tree, snapshot));
    expect(code).toContain('hdsAuditDeprecatedUsage');
    expect(code).not.toMatch(/setTextStyleIdAsync|\.remove\(\)/);
  });
});
