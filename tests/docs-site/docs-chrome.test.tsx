/**
 * Docs-site chrome follows the HDS Corners and Shadow switches (hds#806, slice 1 of the chrome):
 * the theme switch, prose tables and inline code come from HDS, and the search dialog is
 * restyled from the HDS radius and shadow tokens, not Fumadocs' hard-coded ones.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { ThemeSegments } = await import('../../docs-site/components/theme-segments');
const { MdxTable, MdxCode, MdxImg } = await import('../../docs-site/components/mdx-prose');
const { MdxPre } = await import('../../docs-site/components/mdx-code-block');
const { SidebarGroupLabel } = await import('../../docs-site/components/sidebar-group-label');

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('theme switch', () => {
  afterEach(cleanup);

  it('is an HDS SegmentedControl with light, dark and system', () => {
    render(<ThemeSegments theme="light" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeTruthy();
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual([
      'Light',
      'Dark',
      'System',
    ]);
  });

  it('reflects the current theme and sets a new one on click', () => {
    const setTheme = vi.fn();
    render(<ThemeSegments theme="dark" onChange={setTheme} />);
    expect(screen.getByRole('radio', { name: 'Dark' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'System' }));
    expect(setTheme).toHaveBeenCalledWith('system');
  });
});

describe('prose', () => {
  afterEach(cleanup);

  it('wraps a table in the HDS-token frame', () => {
    const { container } = render(
      <MdxTable>
        <tbody>
          <tr>
            <td>x</td>
          </tr>
        </tbody>
      </MdxTable>,
    );
    expect(container.querySelector('.hds-docs-table > table')).toBeTruthy();
  });

  it('renders inline code as the HDS InlineCode', () => {
    const { container } = render(<MdxCode>pnpm build</MdxCode>);
    expect(container.querySelector('code[data-density]')?.textContent).toBe('pnpm build');
  });

  it('keeps a link cue on a linked chip, and none on a plain one', () => {
    const { container } = render(
      <>
        <a href="/x">
          <MdxCode>linked</MdxCode>
        </a>
        <MdxCode>plain</MdxCode>
      </>,
    );
    expect(container.querySelector('a code[data-density]')?.textContent).toBe('linked');
    expect(container.querySelectorAll('code[data-density]').length).toBe(2);
    expect(read('docs-site/app/globals.css')).toMatch(
      /a code\[data-density\]\s*\{[^}]*text-decoration:\s*underline/,
    );
  });

  it('wraps long table chips at word edges, never mid-word', () => {
    const css = read('docs-site/app/globals.css');
    const rule = css.match(/\.hds-docs-table td code\[data-density\][^{]*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toMatch(/overflow-wrap:\s*break-word/);
    expect(rule).not.toMatch(/anywhere/);
  });

  it('leaves a fenced code element plain, and the fence still finds it', () => {
    const { container } = render(
      <MdxPre>
        <MdxCode className="language-bash">{'pnpm build\n'}</MdxCode>
      </MdxPre>,
    );
    expect(container.querySelector('code[data-density]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy();
  });
});

describe('wiring', () => {
  it('maps table and code in the MDX components', () => {
    const mdx = read('docs-site/mdx-components.tsx');
    expect(mdx).toMatch(/table:\s*MdxTable/);
    expect(mdx).toMatch(/code:\s*MdxCode/);
  });

  it('swaps the Fumadocs ThemeSwitch for the HDS one', () => {
    const layout = read('docs-site/app/docs/layout.tsx');
    expect(layout).not.toMatch(/fumadocs-ui\/layouts\/shared\/slots\/theme-switch/);
    expect(layout).toMatch(/<ThemeToggle/);
  });

  it('styles the search dialog from the HDS radius and shadow tokens', () => {
    const css = read('docs-site/app/globals.css');
    const rule = /\[role='dialog'\]:has\(#fd-search-list\)\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('var(--semantic-radius-action)');
    expect(rule).toContain('var(--semantic-shadow-overlay)');
  });

  it('styles prose tables from an HDS radius token', () => {
    const css = read('docs-site/app/globals.css');
    const rule = /\.hds-docs-table\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('var(--semantic-radius-action)');
  });
});

describe('slice 2: sidebar, drawer, contents rail, images', () => {
  const css = () => read('docs-site/app/globals.css');
  const rule = (selector: RegExp) =>
    new RegExp(selector.source + '\\s*\\{([^}]*)\\}').exec(css())?.[1] ?? '';

  it('sidebar, collapse button, search trigger and nav controls take the HDS radius token', () => {
    const body = rule(/#nd-docs-layout\s+:is\(\.rounded-md, \.rounded-lg, \.rounded-xl\)[^{]*/);
    expect(body).toContain('border-radius: var(--semantic-radius-action)');
  });

  it('the mobile drawer shadow comes from the overlay shadow token', () => {
    expect(rule(/#nd-sidebar-mobile/)).toContain('box-shadow: var(--semantic-shadow-overlay)');
    // The generic shadow-lg rule is more specific than an id alone, so it must leave the drawer out.
    expect(css()).toMatch(/\.shadow-lg:not\([^)]*#nd-sidebar-mobile[^)]*\)/);
  });

  it('other Fumadocs shadows (contents popover, collapsed sidebar) use the floating token', () => {
    expect(rule(/#nd-docs-layout \.shadow-lg[^{]*/)).toContain(
      'box-shadow: var(--semantic-shadow-floating)',
    );
  });

  it('renders MDX images with the HDS radius class, not rounded-lg', () => {
    const { container } = render(<MdxImg src="/x.png" alt="x" width={10} height={10} />);
    const img = container.querySelector('img');
    expect(img?.className).toContain('hds-docs-img');
    expect(img?.className).not.toContain('rounded');
    expect(rule(/\.hds-docs-img/)).toContain('border-radius: var(--semantic-radius-action)');
    expect(read('docs-site/mdx-components.tsx')).toMatch(/img:\s*MdxImg/);
  });
});

describe('slice 3: search result rows and the MDX map (hds#806)', () => {
  const css = () => read('docs-site/app/globals.css');

  it('gives search result rows the HDS radius token, not the Sharp override', () => {
    // The dialog is portalled outside #nd-docs-layout, so the layout-chrome rule cannot
    // reach the rows; this rule is keyed on the result list itself.
    const body = /#fd-search-list \[role='option'\]\s*\{([^}]*)\}/.exec(css())?.[1] ?? '';
    expect(body).toContain('border-radius: var(--semantic-radius-action)');
  });

  it('drops the unused Fumadocs components from the MDX map', () => {
    const mdx = read('docs-site/mdx-components.tsx');
    // The defaults are spread only after the Fumadocs chrome is destructured out.
    expect(mdx).toMatch(/\.\.\.baseMdxComponents/);
    expect(mdx).not.toMatch(/\.\.\.defaultMdxComponents/);
    for (const name of [
      'Callout',
      'Card',
      'Cards',
      'CodeBlockTab',
      'CodeBlockTabs',
      'CodeBlockTabsList',
      'CodeBlockTabsTrigger',
    ]) {
      expect(mdx).toContain(`${name}: _fumadocs${name},`);
    }
    // The HDS mappings that slices 1-2 landed stay in the map.
    expect(mdx).toMatch(/table:\s*MdxTable/);
    expect(mdx).toMatch(/code:\s*MdxCode/);
    expect(mdx).toMatch(/img:\s*MdxImg/);
    expect(mdx).toMatch(/pre:\s*MdxPre/);
  });
});

describe('sidebar group labels and drawer header (hds#860)', () => {
  afterEach(cleanup);
  const css = () => read('docs-site/app/globals.css');
  const rule = (selector: string) => {
    const at = css().indexOf(selector + ' {');
    return at < 0 ? '' : css().slice(at, css().indexOf('}', at));
  };

  it('renders a group label as a caption-role section title in the secondary tone', () => {
    const { container } = render(
      <SidebarGroupLabel item={{ type: 'separator', name: 'Explore' }} />,
    );
    const label = container.querySelector('p.hds-docs-nav-label');
    expect(label?.textContent).toBe('Explore');
    expect(label?.className).toContain('hds-type-caption');
    expect(label?.className).toContain('text-[var(--semantic-color-content-secondary)]');
    expect(read('docs-site/app/docs/layout.tsx')).toMatch(/Separator:\s*SidebarGroupLabel/);
  });

  it('spaces each group from HDS tokens, in the desktop sidebar and the drawer alike', () => {
    const body = rule(':is(#nd-sidebar, #nd-sidebar-mobile) .hds-docs-nav-label');
    expect(body).toContain(
      'margin: var(--semantic-space-scale-md) 0 var(--semantic-space-scale-xs)',
    );
    expect(body).not.toMatch(/\d+(px|rem)/);
  });

  // Adrian 2026-11-05 replaced hds#860's "label the first group too": a "Docs" label above
  // "Overview" only repeats what the whole site is, so the top group starts with its pages.
  it('starts the sidebar with a page, not a group label', () => {
    const pages = JSON.parse(read('content/docs/meta.json')).pages as string[];
    expect(pages[0]).toBe('index');
    expect(pages).not.toContain('---Docs---');
  });

  it('holds the drawer header controls at one touch height', () => {
    const height = 'block-size: var(--primitive-size-interactive-min)';
    expect(rule("#nd-sidebar-mobile .hds-docs-display [role='radiogroup']")).toContain(height);
    const buttons = rule(
      '#nd-sidebar-mobile [data-docs-switch-trigger],\n#nd-sidebar-mobile div:has(> .hds-docs-display) > button',
    );
    expect(buttons).toContain(height);
    expect(buttons).toContain('inline-size: var(--primitive-size-interactive-min)');
  });

  it('gives the gear the tertiary variant, so it matches the toggle and takes no hard shadow', () => {
    expect(read('docs-site/components/preview-switches.tsx')).toMatch(/variant="tertiary"/);
  });
});
