import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import Link from 'fumadocs-core/link';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import { source } from '@/lib/source';
import { sectionLandings, type SectionLanding } from '@/lib/section-landings';
import { getMDXComponents } from '@/mdx-components';
import { ComponentIndex } from '@/components/component-index';
import { PageLinks } from '@/components/page-links';
import { PagePager, pagerLabel } from '@/components/page-pager';
import { findNeighbour } from 'fumadocs-core/page-tree';
import { titleWordEm } from '@/lib/title-fit';

/** Frontmatter is loose (source.config.ts), so read the link fields defensively. */
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

/**
 * The title's widest word, in em at the display size. globals.css sizes the title so that
 * word fits the column (a phone steps the display size down): a title never breaks in a word.
 */
const titleFit = (title: string) => ({ '--hds-title-em': titleWordEm(title) }) as CSSProperties;

/** Fewer headings than this and the "On this page" rail is noise. */
const MIN_TOC_ITEMS = 5;

/** Section roots with no index page (hds#647): /docs/components, /docs/patterns, … */
const landings = () => sectionLandings(source.getPages());
const landingFor = (slug?: string[]) =>
  slug?.length === 1 ? landings().find((l) => l.section === slug[0]) : undefined;

const LANDING_DESCRIPTIONS: Record<string, string> = {
  components:
    'Every core component, grouped by what it does. Each page has a live demo, props and tokens.',
  patterns:
    'Page-level building blocks composed from the core components, imported from /patterns.',
};

function SectionLandingPage({ landing }: { landing: SectionLanding }) {
  const grouped = landing.section === 'components' || landing.section === 'patterns';
  return (
    <DocsPage toc={[]} tableOfContent={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle style={titleFit(landing.title)}>{landing.title}</DocsTitle>
      <DocsDescription>
        {LANDING_DESCRIPTIONS[landing.section] ?? `${landing.pages.length} pages in this section.`}
      </DocsDescription>
      <DocsBody>
        {grouped ? (
          <ComponentIndex section={landing.section as 'components' | 'patterns'} />
        ) : (
          <ul>
            {landing.pages.map((p) => (
              <li key={p.url}>
                <Link href={p.url}>{p.title}</Link>
                {p.description ? <span> — {p.description}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </DocsBody>
    </DocsPage>
  );
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    const landing = landingFor(params.slug);
    if (landing) return <SectionLandingPage landing={landing} />;
    notFound();
  }

  const MDXContent = page.data.body;
  // A short page doesn't need a contents rail; prev/next cards repeat the sidebar.
  const hasToc = page.data.toc.length >= MIN_TOC_ITEMS;
  // Previous / next in the sidebar order, within the page's own section (hds#1393).
  const { previous, next } = findNeighbour(source.pageTree, page.url, { separateRoot: true });
  const sameSection = (url?: string) =>
    url && params.slug?.[0] && url.startsWith(`/docs/${params.slug[0]}/`);
  const link = (n?: { url: string; name: unknown }) =>
    n && sameSection(n.url) ? { url: n.url, name: String(n.name) } : undefined;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{ enabled: hasToc }}
      tableOfContentPopover={{ enabled: hasToc }}
      footer={{ enabled: false }}
    >
      {/* The rail renders after the page body, so globals.css reserves its column from this
          early marker: the first paint already has it and the body does not reflow (hds#770). */}
      {hasToc ? <span data-hds-toc hidden /> : null}
      <DocsTitle style={titleFit(page.data.title)}>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <PageLinks figma={str(page.data.figma)} source={str(page.data.source)} />
      <DocsBody>
        <MDXContent components={getMDXComponents()} />
        <PagePager previous={link(previous)} next={link(next)} label={pagerLabel(params.slug)} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return [...source.generateParams(), ...landings().map((l) => ({ slug: [l.section] }))];
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (page) return { title: page.data.title, description: page.data.description };
  const landing = landingFor(params.slug);
  if (!landing) notFound();
  return { title: landing.title, description: LANDING_DESCRIPTIONS[landing.section] };
}
