/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * A token the model DELIBERATELY excludes is not drift (#252 follow-up).
 *
 * `figma-model.mjs` carries NOT_IN_FIGMA: four reasoned exclusions for tokens
 * Figma cannot represent — motion (no variable binds a prototype transition),
 * zIndex (stacking is the layers panel), breakpoints (no media queries), and
 * em/unitless typography (Figma takes px only). Each entry records exactly
 * which tokens it matched, into `model.notInFigma`.
 *
 * The drift report did not read it. So a Figma variable mirroring one of those
 * tokens came back as `extra`, indistinguishable from junk, and the summary
 * line said "add --prune to delete extras".
 *
 * That was one command away from real loss. After the first successful push,
 * 30 of the 35 reported extras were these deliberate exclusions — variables
 * whose values the TOKEN FILE owns. Pruning would have deleted them from
 * Figma and broken every layer bound to them.
 *
 * So the classification has to distinguish three things the old report
 * flattened into one:
 *
 *   extra      in Figma, unknown to code — genuine drift
 *   excluded   in Figma, in code, and the model refuses to manage it, by design
 *   moved      in Figma twice because the Plugin API cannot move collections
 */

import { describe, it, expect } from 'vitest';

import { classifyExtras } from '../lib/figma-drift.mjs';

const MODEL = {
  notInFigma: [
    {
      id: 'z-index',
      reason: 'Stacking order is the layers panel.',
      tokens: ['primitive.zIndex.0'],
    },
    {
      id: 'motion',
      reason: 'Figma cannot bind a prototype transition.',
      tokens: ['primitive.duration.short', 'semantic.motion.exit'],
    },
  ],
};

describe('classifyExtras', () => {
  it('marks a Figma variable that mirrors a deliberately excluded token', () => {
    const [item] = classifyExtras(
      [{ kind: 'extra', collection: 'Hirobius/Primitives', what: 'variable', name: 'zIndex/0' }],
      MODEL,
    );
    expect(item.kind).toBe('excluded');
    expect(item.excludedBy).toBe('z-index');
    expect(item.reason).toMatch(/layers panel/);
  });

  it('maps a nested Figma name onto its dotted token path', () => {
    const [item] = classifyExtras(
      [
        {
          kind: 'extra',
          collection: 'Hirobius/Primitives',
          what: 'variable',
          name: 'duration/short',
        },
      ],
      MODEL,
    );
    expect(item.kind).toBe('excluded');
    expect(item.path).toBe('primitive.duration.short');
  });

  it('uses the collection to pick the tier, not a guess', () => {
    // `motion/exit` under Semantic is semantic.motion.exit; the same leaf name
    // under Primitives would be primitive.motion.exit and match nothing.
    expect(
      classifyExtras(
        [{ kind: 'extra', collection: 'Hirobius/Semantic', what: 'variable', name: 'motion/exit' }],
        MODEL,
      )[0].kind,
    ).toBe('excluded');
    expect(
      classifyExtras(
        [
          {
            kind: 'extra',
            collection: 'Hirobius/Primitives',
            what: 'variable',
            name: 'motion/exit',
          },
        ],
        MODEL,
      )[0].kind,
    ).toBe('extra');
  });

  it('leaves a genuinely unknown variable as extra — the guard', () => {
    // If everything were excused, the report would be useless. This is the
    // case that must keep firing.
    const [item] = classifyExtras(
      [
        {
          kind: 'extra',
          collection: 'Hirobius/Primitives',
          what: 'variable',
          name: 'typography/size/7xl',
        },
      ],
      MODEL,
    );
    expect(item.kind).toBe('extra');
    expect(item.excludedBy).toBeUndefined();
  });

  it('leaves a moved variable alone — it has its own remedy', () => {
    const [item] = classifyExtras(
      [
        {
          kind: 'extra',
          collection: 'Hirobius/Component',
          what: 'variable',
          name: 'badge/bg',
          movedTo: 'Hirobius/Semantic',
        },
      ],
      MODEL,
    );
    expect(item.kind).toBe('moved');
  });

  it('never reclassifies a missing or changed item', () => {
    const items = [
      { kind: 'missing', what: 'variable', name: 'zIndex/0', collection: 'Hirobius/Primitives' },
      { kind: 'changed', what: 'variable', name: 'zIndex/0', collection: 'Hirobius/Primitives' },
    ];
    expect(classifyExtras(items, MODEL).map((i) => i.kind)).toEqual(['missing', 'changed']);
  });

  it('is a no-op when the model records no exclusions', () => {
    const items = [
      { kind: 'extra', collection: 'Hirobius/Primitives', what: 'variable', name: 'zIndex/0' },
    ];
    expect(classifyExtras(items, {}).map((i) => i.kind)).toEqual(['extra']);
    expect(classifyExtras(items, { notInFigma: [] }).map((i) => i.kind)).toEqual(['extra']);
  });

  it('does not excuse a mode or a style, only variables', () => {
    const items = [
      { kind: 'extra', collection: 'Hirobius/Primitives', what: 'mode', name: 'zIndex/0' },
    ];
    expect(classifyExtras(items, MODEL)[0].kind).toBe('extra');
  });
});
