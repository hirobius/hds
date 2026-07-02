/**
 * Figma Code Connect mapping — Button.
 *
 * @internal Not part of the published @hirobius/design-system surface. This file
 * is parsed by the `figma connect` CLI (see figma.config.json), not by the app
 * build or tsc (root `code-connect/` is outside tsconfig `include`).
 *
 * ⚠️ PLACEHOLDER URL — replace <FIGMA_FILE_KEY> and <BUTTON_NODE_ID> with the
 * canonical HDS component-library file + Button node before publishing. See
 * docs/figma-mcp.md § "Canonical Figma file". The mapping below encodes the
 * real code API (variant / tone / size from src/app/components/button.tsx);
 * only the URL coordinates are pending.
 */
import figma from '@figma/code-connect';

import { Button } from '../src/app/components/button';

figma.connect(
  Button,
  'https://www.figma.com/design/<FIGMA_FILE_KEY>?node-id=<BUTTON_NODE_ID>',
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
