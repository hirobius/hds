/**
 * IconButton pattern doc (8t-3a)
 * @doc-ignore — this is a doc *page*, not a component. It documents the
 *   IconButton pattern; the pattern itself owns its tier:pattern
 *   componentSpecs row.
 */

import { Bell, Plus, Trash } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { IconButton } from '../../../components/icon-button';
import { Stack } from '../../../components/stack';
import { PatternDocPage } from './_template';

const PRIMARY_SOURCE = `<IconButton
  icon={Plus}
  variant="primary"
  label="Add item"
  onClick={() => {}}
/>`;

const SIZES_SOURCE = `<Stack direction="row" gap="gap">
  <IconButton icon={Bell} size="sm" label="Notifications" />
  <IconButton icon={Bell} size="md" label="Notifications" />
  <IconButton icon={Bell} size="lg" label="Notifications" />
</Stack>`;

const DESTRUCTIVE_SOURCE = `<IconButton
  icon={Trash}
  variant="secondary"
  label="Delete project"
  onClick={() => {}}
/>`;

export default function IconButtonPatternPage() {
  const { isDark } = useTheme();

  return (
    <PatternDocPage
      title="IconButton"
      intro="Compact icon-only action without text label."
      isDark={isDark}
      whenToUse={[
        'A toolbar or dense surface needs an action that is unambiguous at a glance from its icon.',
        'You need the same hit-area / focus / disabled tokens as Button, just without a text label.',
        'You can supply an accessible label — never ship an icon-only button without one.',
        'Avoid for primary calls-to-action where label clarity matters; prefer Button with text.',
      ]}
      composition="IconButton = Button (iconOnly) + Icon (sized to match the button ramp)"
      examples={[
        {
          title: 'Primary',
          description:
            'Default variant resolution comes from Button; the icon size is derived from the button size unless iconSize overrides it.',
          source: PRIMARY_SOURCE,
          preview: (
            <IconButton icon={Plus} variant="primary" label="Add item" onClick={() => undefined} />
          ),
        },
        {
          title: 'All sizes',
          description:
            'sm / md / lg map to the button hit area and pick the matching icon ramp (small / medium / large).',
          source: SIZES_SOURCE,
          preview: (
            <Stack direction="row" gap="gap">
              <IconButton icon={Bell} size="sm" label="Notifications" />
              <IconButton icon={Bell} size="md" label="Notifications" />
              <IconButton icon={Bell} size="lg" label="Notifications" />
            </Stack>
          ),
        },
        {
          title: 'Destructive',
          description:
            'Use secondary variant for destructive actions; Button has no dedicated destructive variant — rely on icon + aria-label for intent.',
          source: DESTRUCTIVE_SOURCE,
          preview: (
            <IconButton
              icon={Trash}
              variant="secondary"
              label="Delete project"
              onClick={() => undefined}
            />
          ),
        },
      ]}
      primitives={[
        { label: 'Button — base action primitive', href: '/ops/hds/components/actions' },
        { label: 'Icon — Phosphor icon primitive', href: '/ops/hds/components/display' },
      ]}
    />
  );
}
