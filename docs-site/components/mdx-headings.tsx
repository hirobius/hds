import type { HTMLAttributes } from 'react';

type HeadingProps = HTMLAttributes<HTMLHeadingElement>;

/**
 * MDX headings, h1 to h6, as plain elements (hds#806). They keep the id the contents rail links
 * to and drop Fumadocs' per-heading copy-link button, so the prose takes its type from the HDS
 * prose rules alone.
 */
export const mdxHeadings = {
  h1: (props: HeadingProps) => <h1 {...props} />,
  h2: (props: HeadingProps) => <h2 {...props} />,
  h3: (props: HeadingProps) => <h3 {...props} />,
  h4: (props: HeadingProps) => <h4 {...props} />,
  h5: (props: HeadingProps) => <h5 {...props} />,
  h6: (props: HeadingProps) => <h6 {...props} />,
};
