import { Card, Text } from '@hirobius/design-system';

/** One neighbour in the docs nav order. */
export interface PagerLink {
  url: string;
  name: string;
}

/**
 * Previous / next cards at the bottom of a docs page (hds#1393), in the sidebar order. Two
 * HDS Cards, each one real `<a href>` (Card asChild): stacked full width on a phone, side by side
 * from the sm breakpoint. A nav landmark names the set, such as "Component pages".
 */
export function PagePager({
  previous,
  next,
  label,
}: {
  previous?: PagerLink;
  next?: PagerLink;
  label: string;
}) {
  if (!previous && !next) return null;
  return (
    <nav aria-label={label} className="hds-page-pager not-prose">
      {previous ? (
        <Card asChild>
          <a href={previous.url} rel="prev" className="hds-page-pager__card">
            <Text variant="caption" className="hds-page-pager__dir">
              ← Previous
            </Text>
            {/* A spoken and copied separator, so the link reads "← Previous: Accordion" (hds#1393). */}
            <span className="sr-only">: </span>
            <Text variant="ui">{previous.name}</Text>
          </a>
        </Card>
      ) : (
        <span aria-hidden="true" />
      )}
      {next ? (
        <Card asChild>
          <a href={next.url} rel="next" className="hds-page-pager__card hds-page-pager__card--next">
            <Text variant="caption" className="hds-page-pager__dir">
              Next →
            </Text>
            <span className="sr-only">: </span>
            <Text variant="ui">{next.name}</Text>
          </a>
        </Card>
      ) : null}
    </nav>
  );
}

/** The nav label for a page's section: "Component pages", "Foundation pages", … */
export function pagerLabel(slug: string[] | undefined): string {
  const section = slug?.[0] ?? 'docs';
  const words: Record<string, string> = {
    components: 'Component',
    patterns: 'Pattern',
    foundations: 'Foundation',
    guides: 'Guide',
  };
  return `${words[section] ?? 'Docs'} pages`;
}
