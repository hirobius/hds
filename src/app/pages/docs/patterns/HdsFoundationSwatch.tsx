/**
 * FoundationSwatch pattern doc (8t-3b)
 * @doc-ignore — this is a doc *page*, not a component. It documents the
 *   FoundationSwatch pattern; the pattern itself owns its tier:pattern
 *   componentSpecs row.
 */

import { useTheme } from '../../../context/ThemeContext';
import { FoundationSwatch } from '../../../components/foundation-swatch';
import { Grid } from '../../../components/grid';
import { PatternDocPage } from './_template';

const COLOR_SOURCE = `<FoundationSwatch
  label="Surface raised"
  background="var(--semantic-color-surface-raised)"
  tokenPath="semantic.color.surface.raised"
/>`;

const BORDERED_SOURCE = `<FoundationSwatch
  label="Surface page"
  background="var(--semantic-color-surface-page)"
  tokenPath="semantic.color.surface.page"
  bordered
/>`;

const GRID_SOURCE = `<Grid layout="auto-fit" gap="tight">
  <FoundationSwatch label="Primary" background="var(--semantic-accent-rest)" tokenPath="semantic.accent.rest" />
  <FoundationSwatch label="Success" background="var(--semantic-color-feedback-success)" tokenPath="semantic.color.feedback.success" />
  <FoundationSwatch label="Warning" background="var(--semantic-color-feedback-warning)" tokenPath="semantic.color.feedback.warning" />
  <FoundationSwatch label="Error" background="var(--semantic-color-feedback-error)" tokenPath="semantic.color.feedback.error" />
</Grid>`;

export default function FoundationSwatchPatternPage() {
  const { isDark } = useTheme();

  return (
    <PatternDocPage
      title="FoundationSwatch"
      intro="Color and semantic role preview specimen."
      isDark={isDark}
      whenToUse={[
        'A foundation page needs to show a token value alongside the surface it produces.',
        'You want a uniform comparable specimen height across a row of color or role examples.',
        'You need the token path rendered as a chip in the surface, not as a separate caption.',
        'Avoid for product UI — this is a docs-only specimen, not a card or surface primitive.',
      ]}
      composition="FoundationSwatch = Surface (specimen) + Stack (details rhythm) + Token (path chip) + Text (caption)"
      examples={[
        {
          title: 'Solid color specimen',
          description:
            'Default specimen — colored surface, label rendered inside, token path chip pinned to the bottom-left.',
          source: COLOR_SOURCE,
          preview: (
            <FoundationSwatch
              label="Surface raised"
              background="var(--semantic-color-surface-raised)"
              tokenPath="semantic.color.surface.raised"
            />
          ),
        },
        {
          title: 'Bordered specimen',
          description:
            'For low-contrast surfaces (canvas, neutral) the bordered prop adds a hairline border so the specimen reads against the page background.',
          source: BORDERED_SOURCE,
          preview: (
            <FoundationSwatch
              label="Surface page"
              background="var(--semantic-color-surface-page)"
              tokenPath="semantic.color.surface.page"
              bordered
            />
          ),
        },
        {
          title: 'Auto-fit grid of swatches',
          description:
            'Compose with Grid layout="auto-fit" for a responsive specimen row — every swatch keeps the same height regardless of column count.',
          source: GRID_SOURCE,
          preview: (
            <Grid layout="auto-fit" gap="tight">
              <FoundationSwatch
                label="Primary"
                background="var(--semantic-accent-rest)"
                tokenPath="semantic.accent.rest"
              />
              <FoundationSwatch
                label="Success"
                background="var(--semantic-color-feedback-success)"
                tokenPath="semantic.color.feedback.success"
              />
              <FoundationSwatch
                label="Warning"
                background="var(--semantic-color-feedback-warning)"
                tokenPath="semantic.color.feedback.warning"
              />
              <FoundationSwatch
                label="Error"
                background="var(--semantic-color-feedback-error)"
                tokenPath="semantic.color.feedback.error"
              />
            </Grid>
          ),
        },
      ]}
      primitives={[
        { label: 'Surface — padded surface primitive', href: '/components/layout' },
        { label: 'Grid — responsive grid primitive', href: '/components/layout' },
        { label: 'Stack — one-dimensional layout primitive', href: '/components/layout' },
      ]}
    />
  );
}
