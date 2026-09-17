/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/lib/component-code-model.mjs — the TypeScript-backed code
 * model that the Figma parity gates read component props and cva axes from.
 * These run against real component source on purpose: the model is only
 * useful if it reads the repo's actual forwardRef / compound / cva shapes.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCodeModel, extractCva } from '../lib/component-code-model.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('extractCva', () => {
  it('reads variants and defaultVariants from every cva() call in a module', () => {
    const source = `
      import { cva } from 'class-variance-authority';
      const a = cva('base', {
        variants: { tone: { neutral: '', danger: 'x' }, iconOnly: { true: 'p-0', false: '' } },
        defaultVariants: { tone: 'neutral', iconOnly: false },
      });
      const b = cva('other', { variants: { 'size': { sm: '', md: '' } }, defaultVariants: { size: 'md' } });
      const c = cva('no-config');
    `;
    expect(extractCva(source)).toEqual({
      axes: { tone: ['neutral', 'danger'], iconOnly: ['true', 'false'], size: ['sm', 'md'] },
      defaults: { tone: 'neutral', iconOnly: 'false', size: 'md' },
    });
  });

  it('returns empty axes for a module without cva', () => {
    expect(extractCva('export const x = 1;')).toEqual({ axes: {}, defaults: {} });
  });
});

describe('createCodeModel — real components', () => {
  let model;
  beforeAll(() => {
    model = createCodeModel({
      root: ROOT,
      files: [
        'src/app/components/button.tsx',
        'src/app/components/dialog.tsx',
        'src/app/components/heading-stack.tsx',
        'src/app/components/checkbox.tsx',
      ],
    });
  }, 60_000);

  it('resolves forwardRef props, including cva VariantProps', () => {
    const button = model.component('src/app/components/button.tsx', 'Button');
    expect(Object.keys(button.props)).toEqual(
      expect.arrayContaining(['variant', 'tone', 'size', 'loading', 'iconLeft', 'disabled']),
    );
    expect(button.props.tone.optional).toBe(true);
    expect(button.cva.axes.tone).toEqual(['neutral', 'danger', 'success', 'warning', 'info']);
    expect(button.cva.defaults).toMatchObject({ variant: 'secondary', size: 'md' });
  });

  it('marks required props as not optional', () => {
    const checkbox = model.component('src/app/components/checkbox.tsx', 'HdsCheckbox');
    expect(checkbox.props.label.optional).toBe(false);
    expect(checkbox.props.checked.optional).toBe(false);
    expect(checkbox.props.indeterminate.optional).toBe(true);
  });

  it('exposes compound members with their own props', () => {
    const dialog = model.component('src/app/components/dialog.tsx', 'Dialog');
    expect(dialog.props).not.toHaveProperty('title');
    expect(Object.keys(dialog.members)).toEqual(expect.arrayContaining(['Title', 'Content']));
    expect(dialog.members.Content.props).toHaveProperty('hideClose');
    expect(dialog.members.Title.props).toHaveProperty('children');
  });

  it('does not invent props', () => {
    const headingStack = model.component('src/app/components/heading-stack.tsx', 'HeadingStack');
    expect(headingStack.props).toHaveProperty('subheading');
    expect(headingStack.props).not.toHaveProperty('subtext');
  });

  it('returns null for an unknown export', () => {
    expect(model.component('src/app/components/button.tsx', 'Nope')).toBeNull();
  });
});
