/**
 * Disclosure pattern doc (8t-3b)
 * @doc-ignore — this is a doc *page*, not a component. It documents the
 *   Disclosure pattern; the pattern itself owns its tier:pattern
 *   componentSpecs row.
 */

import { useTheme } from '../../../context/ThemeContext';
import { Disclosure } from '../../../components/disclosure';
import { Stack } from '../../../components/stack';
import { Text } from '../../../components/text';
import { PatternDocPage } from './_template';

const PANEL_SOURCE = `<Disclosure label="Why this matters">
  <Text variant="body">
    Disclosures collapse optional explanatory content so the surface stays
    scannable. Open them only when the user opts in.
  </Text>
</Disclosure>`;

const NAV_SOURCE = `<Disclosure label="Components" variant="nav" defaultOpen>
  {/* NavItem children */}
</Disclosure>`;

const CARD_SOURCE = `<Disclosure label="Release notes — v2.4" variant="card">
  <Text variant="body">
    Card variant pads the trigger and content together so the disclosure
    reads as a single object on a layout band.
  </Text>
</Disclosure>`;

export default function DisclosurePatternPage() {
  const { isDark } = useTheme();

  return (
    <PatternDocPage
      title="Disclosure"
      intro="Compact reveal surface for optional content."
      isDark={isDark}
      whenToUse={[
        'Secondary explanation should be available on demand without crowding the primary read.',
        'A nav group needs to collapse to keep deeper hierarchies scannable.',
        'You want a single object (card variant) that expands inline on a layout band.',
        'Avoid for content the user must read to act — that belongs in flow, not behind a trigger.',
      ]}
      composition="Disclosure = Surface (panel|card) + Stack (vertical rhythm) + Icon (caret) + AnimatePresence (height/opacity reveal)"
      examples={[
        {
          title: 'Panel (default)',
          description:
            'Default variant — surface frames the trigger and revealed content with the standard component padding.',
          source: PANEL_SOURCE,
          preview: (
            <Disclosure label="Why this matters">
              <Text variant="body">
                Disclosures collapse optional explanatory content so the surface stays scannable.
                Open them only when the user opts in.
              </Text>
            </Disclosure>
          ),
        },
        {
          title: 'Nav variant',
          description:
            'Trigger-only chrome — no surrounding surface — for sidebar nav groups. Background tints on hover and when open.',
          source: NAV_SOURCE,
          preview: (
            <Disclosure label="Components" variant="nav" defaultOpen>
              <Stack gap="hairline">
                <Text variant="ui">Actions</Text>
                <Text variant="ui">Inputs</Text>
                <Text variant="ui">Display</Text>
              </Stack>
            </Disclosure>
          ),
        },
        {
          title: 'Card variant',
          description:
            'Single-object treatment for a layout band: trigger and content share a padded surface that expands inline.',
          source: CARD_SOURCE,
          preview: (
            <Disclosure label="Release notes — v2.4" variant="card">
              <Text variant="body">
                Card variant pads the trigger and content together so the disclosure reads as a
                single object on a layout band.
              </Text>
            </Disclosure>
          ),
        },
      ]}
      primitives={[
        { label: 'Surface — padded surface primitive', href: '/components/layout' },
        { label: 'Stack — one-dimensional layout primitive', href: '/components/layout' },
        { label: 'Icon — Phosphor icon primitive', href: '/components/display' },
      ]}
    />
  );
}
