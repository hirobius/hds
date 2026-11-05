/**
 * Contract test: Button accessibility rules (hds#520).
 *
 * Each `it` title carries the `a11y:<id>` the Button `@a11y component` tags point
 * at, so check-a11y-contracts can prove every rule has a test. Keyboard cases
 * drive a real keyboard (user-event), not synthetic clicks.
 *
 * @primitive Button
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Search } from 'lucide-react';
import { Button } from '@/app/components/button';
import { Icon } from '@/app/components/icon';
import { resolveAlias } from '../../scripts/lib/token-tree.mjs';
import { contrastRatio } from '../../validators/contrast.mjs';

afterEach(cleanup);

// Read as text: the module resolves its accents folder from import.meta.url, which is not a file URL under jsdom.
const contrastPairs = readFileSync(
  resolve(__dirname, '../../scripts/lib/contrast-pairs.mjs'),
  'utf8',
);
const tokens = JSON.parse(readFileSync(resolve(__dirname, '../../hirobius.tokens.json'), 'utf8'));

/** `top` at `alpha` over `bottom`, as a hex. */
function mix(top: string, bottom: string, alpha: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(ch(top, i) * alpha + ch(bottom, i) * (1 - alpha))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** A semantic colour token's hex in light or dark, the way check-contrast resolves it. */
function hex(dotPath: string, mode: 'light' | 'dark'): string {
  const node = dotPath.split('.').reduce((n, k) => n?.[k], tokens);
  const raw =
    mode === 'dark'
      ? (node.$extensions?.['com.figma.variables']?.modes?.Dark ?? node.$value)
      : node.$value;
  return String(resolveAlias(raw, tokens, { maxDepth: 10 }));
}

const tokensCss = readFileSync(resolve(__dirname, '../../src/styles/tokens.generated.css'), 'utf8');

/** A token's px value, following var() aliases. */
function tokenPx(name: string): number | undefined {
  const value = tokensCss.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1] ?? '';
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  if (alias) return tokenPx(alias[1]);
  const px = value.match(/^(\d+)px$/);
  return px ? Number(px[1]) : undefined;
}

/** A height/width class to px: `h-8` at the 4px scale, or `h-[var(--token)]` through the token (hds#760). */
function px(className: string, axis: 'h' | 'w'): number | undefined {
  for (const c of className.split(/\s+/)) {
    if (new RegExp(`^${axis}-\\d+$`).test(c)) return Number(c.slice(2)) * 4;
    const bound = c.match(new RegExp(`^${axis}-\\[var\\((--[\\w-]+)\\)\\]$`));
    if (bound) return tokenPx(bound[1]);
  }
  return undefined;
}

describe('Button accessibility contract', () => {
  it('a11y:button.keyboard-activate - Enter and Space both activate it', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Save' }));
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('a11y:button.focus-ring - keyboard focus draws a ring from utilities and never removes the outline bare', () => {
    render(<Button>Save</Button>);
    const cls = screen.getByRole('button').className.split(/\s+/);
    // .hds-focus draws the shared semantic.focus.* outline; nothing removes it.
    expect(cls).toContain('hds-focus');
    expect(cls).not.toContain('focus-visible:outline-none');
  });

  it('a11y:button.loading-busy - loading sets aria-busy, disables the button and hides the spinner', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.disabled).toBe(true);
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('a11y:button.toggle-pressed - a toggle reports its state with aria-pressed and flips it on activation', async () => {
    const user = userEvent.setup();
    render(<Button defaultPressed={false}>Bold</Button>);
    const button = screen.getByRole('button', { name: 'Bold' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await user.tab();
    await user.keyboard(' ');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    await user.keyboard('{Enter}');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('a11y:button.aschild-disabled - a disabled slotted link is aria-disabled and leaves the tab order', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Button asChild disabled>
          <a href="/x">Docs</a>
        </Button>
        <Button>After</Button>
      </>,
    );
    const link = screen.getByText('Docs');
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.getAttribute('tabindex')).toBe('-1');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }));
  });

  it('a11y:button.icon-only-name - an icon-only button takes its name from label', () => {
    render(<Button iconOnly label="Search" iconLeft={<Icon icon={Search} size="small" />} />);
    expect(screen.getByRole('button', { name: 'Search' })).not.toBeNull();
  });

  it('a11y:button.target-size - every size is at least 24px tall, and an icon-only one at least 24px wide', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const { unmount } = render(
        <>
          <Button size={size}>Text</Button>
          <Button
            size={size}
            iconOnly
            label="Icon"
            iconLeft={<Icon icon={Search} size="small" />}
          />
        </>,
      );
      const [text, icon] = screen.getAllByRole('button');
      expect(px(text.className, 'h'), `${size} height`).toBeGreaterThanOrEqual(24);
      expect(px(icon.className, 'h'), `${size} icon height`).toBeGreaterThanOrEqual(24);
      expect(px(icon.className, 'w'), `${size} icon width`).toBeGreaterThanOrEqual(24);
      unmount();
    }
  });

  it('a11y:button.reduced-motion - the loading spinner stops under prefers-reduced-motion', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button').querySelector('svg')?.getAttribute('class')).toContain(
      'motion-reduce:animate-none',
    );
  });

  it('a11y:button.quiet-focus-ring - the quiet tone, flush and link keep the focus-visible ring', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Button variant="tertiary" tone="quiet">
          Set aside
        </Button>
        <Button variant="tertiary" flush>
          Back
        </Button>
        <Button variant="link">Clear</Button>
        <Button variant="link" tone="quiet">
          Details
        </Button>
      </>,
    );
    for (const name of ['Set aside', 'Back', 'Clear', 'Details']) {
      await user.tab();
      const button = screen.getByRole('button', { name });
      expect(document.activeElement).toBe(button);
      const cls = button.className.split(/\s+/);
      expect(cls, name).toContain('hds-focus');
    }
  });

  it('a11y:button.quiet-contrast - quiet text clears 4.5:1 at rest, hovered and pressed, light and dark', () => {
    render(
      <Button variant="tertiary" tone="quiet">
        Set aside
      </Button>,
    );
    const cls = screen.getByRole('button').className.split(/\s+/);
    // The text is content.secondary (role.muted-foreground) in every state.
    expect(cls).toContain('text-muted-foreground');
    expect(tokensCss).toMatch(
      /--role-muted-foreground:\s*var\(--semantic-color-content-secondary\)/,
    );
    // Rest: a ghost on the page or a raised surface. Hover: the wipe fill, surface.hover.
    for (const bg of ['surface.page', 'surface.raised', 'surface.hover']) {
      for (const mode of ['light', 'dark'] as const) {
        const ratio = contrastRatio(
          hex('semantic.color.content.secondary', mode),
          hex(`semantic.color.${bg}`, mode),
        );
        expect(ratio, `${bg} ${mode}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    // check-contrast gates the hover pair on every push (rest is already gated).
    expect(contrastPairs).toContain(
      "text: 'semantic.color.content.secondary',\n    bg: 'semantic.color.surface.hover',",
    );
    // Press: the base 5% pressed-overlay wash over the surface, not the surface.soft fill
    // (content.secondary on surface.soft is under 4.5:1 in dark).
    expect(cls).toContain('active:inset-shadow-pressed-overlay/5');
    expect(cls).not.toContain('active:bg-[color:var(--component-button-tertiary-bg-pressed)]');
    for (const bg of ['surface.page', 'surface.raised']) {
      for (const mode of ['light', 'dark'] as const) {
        const ratio = contrastRatio(
          hex('semantic.color.content.secondary', mode),
          mix(
            hex('semantic.color.state.pressed.overlay', mode),
            hex(`semantic.color.${bg}`, mode),
            0.05,
          ),
        );
        expect(ratio, `pressed on ${bg} ${mode}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
