import { useState } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FoundationSwatch } from '../../components/foundation-swatch';
import { IconButton } from '../../components/icon-button';
import { PreviewFrame } from '../../components/preview-frame';
import { Surface } from '../../components/surface';
import { Stack } from '../../components/stack';
import { useTheme } from '../../context/ThemeContext';
import hds from '../../design-system/tokens';
import { resolveTokenLiteralValue } from '../../components/lab/tokenUtils';
import { HdsFoundationSection, FoundationSwatchGrid, useIsMobile } from './HdsDocPrimitives';
import { FoundationDocPage } from './FoundationDocPage';

const SURFACE_SWATCHES = [
  { tier: 'page', tokenPath: 'semantic.color.surface.page' },
  { tier: 'raised', tokenPath: 'semantic.color.surface.raised' },
  { tier: 'overlay', tokenPath: 'semantic.color.surface.overlay' },
] as const;

const ROLE_ALIASES: Array<{ alias: string; semantic: string }> = [
  { alias: '--role-background', semantic: 'semantic.color.surface.page' },
  { alias: '--role-card', semantic: 'semantic.color.surface.raised' },
  { alias: '--role-popover', semantic: 'semantic.color.surface.overlay' },
  { alias: '--role-primary', semantic: 'semantic.color.surface.accent' },
  { alias: '--role-accent', semantic: 'semantic.color.surface.accentSubtle' },
  { alias: '--role-secondary', semantic: 'semantic.color.surface.raised' },
  { alias: '--role-muted', semantic: 'semantic.color.surface.overlay' },
  { alias: '--role-destructive', semantic: 'semantic.color.feedback.error' },
];

function ElevationInteractiveDemo() {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <PreviewFrame minHeight={260} align="start">
      <div>
        <span
          style={{
            ...hds.typeStyles.technical,
            color: 'var(--semantic-color-content-secondary)',
            marginTop: hds.semantic.space.layout.gap,
            marginBottom: hds.semantic.space.component.padding,
          }}
        >
          page
        </span>

        <Surface
          padding="component"
          style={{
            background: 'var(--semantic-color-surface-raised)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: hds.semantic.space.component.padding,
            }}
          >
            <span
              style={{
                ...hds.typeStyles.technical,
                color: 'var(--semantic-color-content-secondary)',
              }}
            >
              raised
            </span>
            <IconButton
              icon={Plus}
              variant="secondary"
              size="sm"
              aria-label="Toggle panel"
              onClick={() => setPanelOpen((value) => !value)}
            />
          </div>
        </Surface>

        <AnimatePresence>
          {panelOpen ? (
            <motion.div
              key="panel"
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{
                height: 72,
                opacity: 1,
                marginTop: hds.semantic.space.component.padding,
                transition: { duration: hds.motion.expressive.duration, ease: 'easeOut' },
              }}
              exit={{
                height: 0,
                opacity: 0,
                marginTop: 0,
                transition: { duration: hds.motion.productive.duration, ease: 'easeIn' },
              }}
              style={{
                overflow: 'hidden',
                background: 'var(--semantic-color-surface-overlay)',
                borderRadius: hds.borderRadius[4],
                display: 'flex',
                alignItems: 'flex-start',
                padding: hds.semantic.space.component.padding,
              }}
            >
              <span
                style={{
                  ...hds.typeStyles.technical,
                  color: 'var(--semantic-color-content-secondary)',
                }}
              >
                overlay
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </PreviewFrame>
  );
}

export default function ElevationPage() {
  const { isDark } = useTheme();
  const isMobile = useIsMobile();
  const mode = isDark ? 'dark' : 'light';

  return (
    <FoundationDocPage
      title="Elevation"
      description="4 role-based elevation tokens (flat / raised / floating / overlay) bundle surface + shadow + border so primitives stay coherent."
    >
      <HdsFoundationSection
        title="Surface hierarchy"
        intro="Each role bundles a surface color, shadow, and border. Cards default to flat (border, no shadow). Interactive cards lift to raised. Popovers use floating. Dialogs use overlay."
        marginTop={0}
      >
        <FoundationSwatchGrid columns={isMobile ? 1 : 4}>
          {SURFACE_SWATCHES.map(({ tier, tokenPath }) => {
            const resolvedValue = resolveTokenLiteralValue(tokenPath, mode);
            return (
              <FoundationSwatch
                key={tier}
                label={tier}
                hidePreviewLabel
                tokenPath={tokenPath}
                tokenDisplayPreset="depth1"
                previewPosition="bottom-left"
                value={typeof resolvedValue === 'string' ? resolvedValue.toLowerCase() : undefined}
                background={`var(--semantic-color-surface-${tier})`}
                foreground="var(--semantic-color-content-primary)"
                swatchVar={`var(--semantic-color-surface-${tier})`}
              />
            );
          })}
        </FoundationSwatchGrid>
      </HdsFoundationSection>

      <HdsFoundationSection
        title="Overlay behavior"
        intro="Motion introduces overlay depth without changing the underlying surface language."
      >
        <Stack gap="normal">
          <ElevationInteractiveDemo />
        </Stack>
      </HdsFoundationSection>

      <HdsFoundationSection
        title="Shadcn role aliases"
        intro="Shadcn-baseline primitives (Button, Card, Dialog) consume these same surfaces through Tailwind-friendly aliases. The aliases add no new design decisions — they map to the existing semantic tokens, so adopting shadcn did not change the elevation language."
      >
        <Stack
          as="dl"
          gap="tight"
          style={{
            margin: 0,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr',
            columnGap: hds.semantic.space.layout.gap,
            rowGap: hds.semantic.space.subgrid.gap,
            alignItems: 'baseline',
          }}
        >
          {ROLE_ALIASES.map(({ alias, semantic }) => (
            <div key={alias} style={{ display: 'contents' }}>
              <dt
                style={{
                  ...hds.typeStyles.technical,
                  color: 'var(--semantic-color-content-primary)',
                  margin: 0,
                }}
              >
                {alias}
              </dt>
              <dd
                style={{
                  ...hds.typeStyles.technical,
                  color: 'var(--semantic-color-content-secondary)',
                  margin: 0,
                }}
              >
                → {semantic}
              </dd>
            </div>
          ))}
        </Stack>
      </HdsFoundationSection>
    </FoundationDocPage>
  );
}

// ADR-017 nav metadata — drives the generated nav-model.json (see scripts/generate-nav-model.mjs).
export const meta = {
  path: '/elevation',
  title: 'Elevation',
  description: 'Shadow and z-index',
  section: 'Foundations',
  order: 5,
} satisfies import('../../data/nav-model').HdsPageMeta;
