/**
 * MDX code fences render through the HDS CodeBlock, not Fumadocs' own one, so
 * they take HDS radius tokens and the docs Corners switch, and drop Fumadocs' shadow.
 * The fence's text is the copy source and HDS colours it by language.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { MdxPre } = await import('../../docs-site/components/mdx-code-block');
const { Mermaid } = await import('../../docs-site/components/mermaid');

const ROOT = join(__dirname, '..', '..');

// What MDX hands `pre` for a fence with no rehype highlighter: one <code> with
// a language-* class and the raw text plus a trailing newline.
const fence = (lang: string | undefined, text: string) => (
  <MdxPre>
    <code className={lang ? `language-${lang}` : undefined}>{`${text}\n`}</code>
  </MdxPre>
);

describe('MDX code fences', () => {
  afterEach(cleanup);

  it('render the HDS CodeBlock with its language label', () => {
    const { container } = render(fence('tsx', "import { Button } from 'x';"));
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy();
    expect(screen.getByText('tsx')).toBeTruthy();
    // HDS block chrome: the raised tonal fill (no outline, hds#891) and the radius class the
    // Corners switch zeroes.
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('rounded-md');
    expect(root.className).toContain('bg-[var(--semantic-color-surface-raised)]');
    expect(root.className).not.toContain('border-[var(--semantic-color-border-default)]');
    expect(container.querySelector('figure')).toBeNull();
  });

  it('colour code through HDS tokens', () => {
    const { container } = render(fence('tsx', "import { Button } from 'x';"));
    const keyword = [...container.querySelectorAll('code span')].find(
      (s) => s.textContent === 'import',
    );
    expect(keyword?.className).toContain('--semantic-color-content-accent');
  });

  it('copy the fence text without the trailing newline', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(fence('bash', 'pnpm add @hirobius/design-system'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    });
    expect(writeText).toHaveBeenCalledWith('pnpm add @hirobius/design-system');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
  });

  it('render a fence with no language as plain code with no header', () => {
    const { container } = render(fence(undefined, 'plain text'));
    expect(screen.getByText('plain text')).toBeTruthy();
    expect(container.querySelector('.border-b')).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy();
  });

  it('pass a non-code <pre> through untouched', () => {
    const { container } = render(<MdxPre className="x">raw</MdxPre>);
    expect(container.querySelector('pre.x')?.textContent).toBe('raw');
  });

  it('are wired in: mdx-components maps pre to it and Shiki is off', () => {
    const mdx = readFileSync(join(ROOT, 'docs-site/mdx-components.tsx'), 'utf8');
    expect(mdx).toMatch(/pre:\s*MdxPre/);
    const config = readFileSync(join(ROOT, 'docs-site/source.config.ts'), 'utf8');
    expect(config).toMatch(/rehypeCodeOptions:\s*false/);
  });

  it('render a mermaid fence as a diagram, not a code block (hds#1148)', () => {
    const chart = 'flowchart LR\n  A --> B';
    const el = MdxPre({
      children: <code className="language-mermaid">{`${chart}\n`}</code>,
    }) as { type: unknown; props: { chart: string } };
    expect(el.type).toBe(Mermaid);
    expect(el.props.chart).toBe(chart);
  });
});
