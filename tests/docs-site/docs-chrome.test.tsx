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

  // hds#1398: the frame owns the stroke and the radius, so a wide table scrolling under it on
  // a phone never loses the stroke at a rounded corner. The table has no border of its own.
  it('draws the prose table outline on the frame, not on the table', () => {
    const css = read('docs-site/app/globals.css');
    const frame = /\.hds-docs-table\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(frame).toMatch(
      /border:\s*var\(--semantic-borderWidth-default\) solid var\(--semantic-color-border-default\)/,
    );
    expect(frame).toMatch(/overflow:\s*auto/);
    const table = /\.prose \.hds-docs-table > table\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(table).toMatch(/border:\s*0/);
    expect(table).toMatch(/border-radius:\s*0/);
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

  it('maps no Fumadocs component in the MDX map', () => {
    const mdx = read('docs-site/mdx-components.tsx');
    // Fumadocs' defaults are not spread, so its Callout, Cards and CodeBlockTabs never render.
    expect(mdx).not.toMatch(/defaultMdxComponents|baseMdxComponents/);
    for (const name of ['Callout', 'Card', 'Cards', 'CodeBlockTabs']) {
      expect(mdx).not.toMatch(new RegExp(`^\\s+${name}[,:]`, 'm'));
    }
    // The HDS mappings that slices 1-2 landed stay in the map.
    expect(mdx).toMatch(/table:\s*MdxTable/);
    expect(mdx).toMatch(/code:\s*MdxCode/);
    expect(mdx).toMatch(/img:\s*MdxImg/);
    expect(mdx).toMatch(/pre:\s*MdxPre/);
  });
});

describe('slice 4: no Fumadocs MDX defaults left (hds#806)', () => {
  afterEach(cleanup);

  it('no longer imports the Fumadocs MDX map', () => {
    expect(read('docs-site/mdx-components.tsx')).not.toMatch(/fumadocs-ui\/mdx/);
  });

  it('renders every heading level plain: the id stays, no Fumadocs copy-link button', async () => {
    const { mdxHeadings } = await import('../../docs-site/components/mdx-headings');
    const map = mdxHeadings as Record<string, (p: object) => JSX.Element>;
    expect(read('docs-site/mdx-components.tsx')).toMatch(/\.\.\.mdxHeadings/);
    for (const level of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      const Heading = map[level];
      const { container } = render(<Heading id={`x-${level}`}>Title</Heading>);
      const el = container.querySelector(level);
      expect(el?.id).toBe(`x-${level}`);
      expect(el?.querySelector('a, svg, button')).toBeNull();
      cleanup();
    }
  });
});

describe('sidebar group labels and drawer header (hds#860)', () => {
  afterEach(cleanup);
  const css = () => read('docs-site/app/globals.css');
  const rule = (selector: string) => {
    const at = css().indexOf(selector + ' {');
    return at < 0 ? '' : css().slice(at, css().indexOf('}', at));
  };

  // Adrian 2026-11-05: in the secondary tone at the nav items' weight, "About HDS" read as one
  // more item. The label now differs in colour and weight, not only 2px of size.
  it('renders a group label as a bold, primary caption heading, unlike the secondary items', () => {
    const { container } = render(
      <SidebarGroupLabel item={{ type: 'separator', name: 'About HDS' }} />,
    );
    const label = container.querySelector('p.hds-docs-nav-label');
    expect(label?.textContent).toBe('About HDS');
    expect(label?.className).toContain('hds-type-caption');
    expect(label?.className).toContain('text-[var(--semantic-color-content-primary)]');
    expect(label?.className).toContain('weight-bold');
    expect(label?.className).not.toContain('content-secondary');
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
  // Adrian 2026-11-05: the pages about HDS itself sit under one group label, after the
  // reference sections. A label, not a folder, so /docs/engineering and /docs/voice keep their URLs.
  // The case study (hds#1148) sits between them.
  it('groups the engineering, case study and voice pages under "About HDS"', () => {
    const pages = JSON.parse(read('content/docs/meta.json')).pages as string[];
    const at = pages.indexOf('---About HDS---');
    expect(at).toBeGreaterThan(pages.indexOf('guides'));
    expect(pages.slice(at + 1, at + 4)).toEqual(['engineering', 'case-study', 'voice']);
  });

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
