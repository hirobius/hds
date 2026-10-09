import { notFound } from 'next/navigation';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import { source } from '@/lib/source';
import { getMDXComponents } from '@/mdx-components';
import { PageLinks } from '@/components/page-links';

/** Frontmatter is loose (source.config.ts), so read the link fields defensively. */
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

/** Fewer headings than this and the "On this page" rail is noise. */
const MIN_TOC_ITEMS = 5;

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDXContent = page.data.body;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      // A short page doesn't need a contents rail; prev/next cards repeat the sidebar.
      tableOfContent={{ enabled: page.data.toc.length >= MIN_TOC_ITEMS }}
      tableOfContentPopover={{ enabled: page.data.toc.length >= MIN_TOC_ITEMS }}
      footer={{ enabled: false }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <PageLinks figma={str(page.data.figma)} source={str(page.data.source)} />
      <DocsBody>
        <MDXContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
