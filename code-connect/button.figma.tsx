/**
 * Figma Code Connect mapping — Button.
 *
 * @internal Not part of the published @hirobius/design-system surface. This file
 * is parsed by the `figma connect` CLI (see figma.config.json), not by the app
 * build or tsc (root `code-connect/` is outside tsconfig `include`).
 *
 * File confirmed: c8MaVgwxOlxm4wr8wnH0Z4 ("HDS Tokens & Components"). The Button
 * component set there matches this code's API exactly (variant / tone / size).
 * Only <BUTTON_NODE_ID> is pending — open the Button component set in Figma and
 * copy the node-id from the URL (e.g. ?node-id=123-4 → "123:4"). Publishing
 * (`figma connect publish`) additionally requires an Org/Enterprise plan + Dev
 * seat; the Hirobius team is on `pro`. See docs/figma-mcp.md.
 */
import figma from '@figma/code-connect';

import { Button } from '../src/app/components/button';

figma.connect(
  Button,
  'https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens---Components?node-id=<BUTTON_NODE_ID>',
  {
    props: {
      variant: figma.enum('Variant', {
        Primary: 'primary',
        Secondary: 'secondary',
        Tertiary: 'tertiary',
      }),
      tone: figma.enum('Tone', {
        neutral: 'neutral',
        danger: 'danger',
        success: 'success',
        warning: 'warning',
        info: 'info',
      }),
      size: figma.enum('Size', {
        sm: 'sm',
        md: 'md',
        lg: 'lg',
      }),
      label: figma.string('Label'),
    },
    example: ({ variant, tone, size, label }) => (
      <Button variant={variant} tone={tone} size={size}>
        {label}
      </Button>
    ),
  },
);
