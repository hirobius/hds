import { Compass, Search, LayoutGrid } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { DocLinkCard } from '../../components/doc-link-card';
import { InlineCode } from '../../components/inline-code';
import { Stack } from '../../components/stack';
import { Text } from '../../components/text';
import { DocPageHeader, DocSection } from './HdsDocPrimitives';

const _STARTING_POINTS = [
  {
    title: 'Read the model first',
    body: 'Start with Overview and Tokens so the system story makes sense before you drop into implementation detail.',
    icon: Compass,
  },
  {
    title: 'Use the tokens page actively',
    body: 'The live reference is the fastest way to see names, alias layers, and where a value belongs.',
    icon: Search,
  },
  {
    title: 'Treat components as production primitives',
    body: 'The component family pages document the reusable UI layer the site already uses.',
    icon: LayoutGrid,
  },
] as const;

const ENTRY_LINKS = [
  {
    href: '/ops/hds/color',
    title: 'Overview',
    description: 'Scope, current status, stack choices, and the role HDS plays in the portfolio.',
    icon: Compass,
  },
  {
    href: '/ops/hds/tokens',
    title: 'Tokens',
    description: 'Live token reference, naming patterns, and the explorer.',
    icon: Search,
  },
  {
    href: '/ops/hds/components/actions',
    title: 'Actions',
    description:
      'The first shared component family and the entry point into the reusable UI layer.',
    icon: LayoutGrid,
  },
] as const;

export default function GettingStartedPage() {
  const { isDark } = useTheme();

  return (
    <div className="hds-page-enter">
      <article>
        <DocPageHeader
          group="Foundations"
          title="Getting Started"
          isDark={isDark}
          intro="Read HDS in layers: Overview first, then Tokens, then Components. That order keeps the system easier to explain and easier to trust."
        />

        <DocSection title="Start Here" isDark={isDark}>
          <Stack gap="px24">
            <Stack gap="gap">
              {ENTRY_LINKS.map((item) => (
                <DocLinkCard
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  description={item.description}
                  icon={item.icon}
                  variant="feature"
                />
              ))}
            </Stack>

            <Text
              variant="body"
              as="p"
              style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
            >
              Use the docs in layers, not alphabetically. Start with the conceptual pages first,
              then move into token reference, then into components, then into the narrower
              foundation categories only when you need those details.
            </Text>
            <Text
              variant="body"
              as="p"
              style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
            >
              Overview, Tokens, and Components are the main path. Components live in{' '}
              <InlineCode>src/app/components/</InlineCode>, patterns are compositions of existing
              components, and tokens plus generated docs should stay in sync.
            </Text>
          </Stack>
        </DocSection>
      </article>
    </div>
  );
}
