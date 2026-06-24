/**
 * ActionsPage - /hds/components/actions
 *
 * Components: Button, IconButton
 * Category validated against: Material Design (Buttons), Ant Design (Button),
 * Radix UI (Button), Chakra UI (Button) - buttons and icon-only triggers are
 * universally classified under "Actions" or an equivalent.
 */

import { type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { CategoryComponentDocs } from '../../../components/CategoryComponentDocs';
import { Button } from '../../../components/button';
import { IconButton } from '../../../components/icon-button';
import { DemoBlock } from '../../../components/demo-block';
import { Stack } from '../../../components/stack';
import { ComponentDocPageShell } from './ComponentDocPageShell';

export default function ActionsPage() {
  const { isDark } = useTheme();

  const configs = {
    Button: {
      matrix: (
        <Stack gap="tight">
          <DemoBlock heading="Variants">
            <Stack gap="tight" align="start">
              <Button variant="primary">Save changes</Button>
              <Button variant="secondary">Save changes</Button>
              <Button variant="tertiary">Save changes</Button>
            </Stack>
          </DemoBlock>
          <DemoBlock heading="Sizes">
            <Stack gap="tight" align="start">
              <Button variant="primary" size="sm">
                Save changes
              </Button>
              <Button variant="primary" size="md">
                Save changes
              </Button>
              <Button variant="primary" size="lg">
                Save changes
              </Button>
            </Stack>
          </DemoBlock>
          <DemoBlock heading="Disabled">
            <Stack gap="tight" align="start">
              <Button variant="primary" disabled>
                Save changes
              </Button>
              <Button variant="secondary" disabled>
                Save changes
              </Button>
              <Button variant="tertiary" disabled>
                Save changes
              </Button>
            </Stack>
          </DemoBlock>
        </Stack>
      ),
    },
    IconButton: {
      matrix: (
        <Stack gap="tight">
          <DemoBlock heading="Variants">
            <Stack gap="tight" align="start">
              <IconButton icon={ChevronRight} variant="primary" aria-label="Primary icon button" />
              <IconButton
                icon={ChevronRight}
                variant="secondary"
                aria-label="Secondary icon button"
              />
              <IconButton
                icon={ChevronRight}
                variant="tertiary"
                aria-label="Tertiary icon button"
              />
            </Stack>
          </DemoBlock>
          <DemoBlock heading="Sizes">
            <Stack gap="tight" align="start">
              <IconButton
                icon={ChevronRight}
                size="sm"
                variant="primary"
                aria-label="Small icon button"
              />
              <IconButton
                icon={ChevronRight}
                size="md"
                variant="primary"
                aria-label="Medium icon button"
              />
              <IconButton
                icon={ChevronRight}
                size="lg"
                variant="primary"
                aria-label="Large icon button"
              />
            </Stack>
          </DemoBlock>
          <DemoBlock heading="Disabled">
            <Stack gap="tight" align="start">
              <IconButton
                icon={ChevronRight}
                variant="primary"
                disabled
                aria-label="Primary disabled icon button"
              />
              <IconButton
                icon={ChevronRight}
                variant="secondary"
                disabled
                aria-label="Secondary disabled icon button"
              />
              <IconButton
                icon={ChevronRight}
                variant="tertiary"
                disabled
                aria-label="Tertiary disabled icon button"
              />
            </Stack>
          </DemoBlock>
        </Stack>
      ),
    },
  } satisfies Record<string, { matrix?: ReactNode; children?: ReactNode }>;

  return (
    <ComponentDocPageShell
      title="Actions"
      isDark={isDark}
      intro="Standardized controls for triggering tasks and navigation."
    >
      <CategoryComponentDocs
        category="Actions"
        isDark={isDark}
        preferredOrder={['Button', 'IconButton']}
        configs={configs}
        hideDetails
        hideVariantDeck
        hideHero
      />
    </ComponentDocPageShell>
  );
}
