// @doc-exempt: documentation shell for generated
/**
 * HdsComponentDoc - storefront documentation shell for shared components and internal utilities.
 * @category Utilities
 */
import { Figma as FigmaLogo } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import systemManifestData from 'virtual:hds-manifest';
import type {
  ComponentApiManifest as BaseComponentApiManifest,
  SystemManifest as BaseSystemManifest,
  ManifestComponentSpec,
  ManifestApiComponent,
} from '../data/manifest-types';
import hds from '../design-system/tokens';
import componentApiManifest from '../data/component-api.json';
import { useToc, slugify } from '../pages/hds/HdsTocContext';
import { Disclosure } from './disclosure';
import { TextLockup } from './text-lockup';
import { Table } from './table';
import { PreviewFrame } from './preview-frame';
import { Token } from './token';
import { Button } from './button';
import { Alert } from './alert';
import { SegmentedControl } from './segmented-control';
import { Icon } from './icon';
import { buildPropTableRows, PROP_TABLE_COLUMNS, type ComponentPropRow } from './propTableUtils';
import { buildObservedTokenRows, buildReflectiveTokenRows } from './tokenTableUtils';
import { SpecimenBlock } from './specimen-block';
import { Stack } from './stack';
import { Surface } from './surface';

const tabPanelTransition = {
  duration: hds.motion.productive.duration,
  ease: hds.motion.productive.easing,
} as const;

type ComponentDocTabId = 'properties' | 'tokens' | 'usage';

// ComponentDocPage requires the API component entry to have a required props
// array of ComponentPropRow (not the loose ManifestApiPropRow superset), since
// it passes props directly to buildPropTableRows. We derive a local narrowed
// type to preserve the guarantee without re-declaring the full shape.
type DocApiEntry = Omit<ManifestApiComponent, 'props'> & { props: ComponentPropRow[] };
type ComponentApiManifest = Omit<BaseComponentApiManifest, 'components'> & {
  components: Record<string, DocApiEntry>;
};

// ComponentDocPage requires category and figmaUrl to be present (non-optional)
// on the spec entries it reads. Derive from the canonical type.
type DocComponentSpec = ManifestComponentSpec & {
  category: string;
  figmaUrl: string | null;
};
type SystemManifest = Omit<BaseSystemManifest, 'componentSpecs'> & {
  componentSpecs: Record<string, DocComponentSpec>;
};

const componentApi = componentApiManifest as ComponentApiManifest;
const systemManifest = systemManifestData as SystemManifest;

const placeholderSurfaceStyle = {
  ['display']: 'grid',
  gap: hds.semantic.space.component.gap,
  minHeight: hds.size[80],
  alignContent: 'center',
  justifyItems: 'center',
};

const tokenAnatomyPrimaryStyle = {
  ...hds.typeStyles.ui,
  color: 'var(--semantic-color-content-primary)',
};

const tokenAnatomyDetailStyle = {
  ...hds.typeStyles.caption,
  color: 'var(--semantic-color-content-secondary)',
};

function formatUnfinishedComponentLabel(name: string) {
  const stripped = name.replace(/^Hds/, '');
  return stripped.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function renderTokenAnatomy(row: { whereLabel: string; whereDetail?: string }) {
  return (
    <div>
      <span style={tokenAnatomyPrimaryStyle}>{row.whereLabel}</span>
      {row.whereDetail ? <span style={tokenAnatomyDetailStyle}>{row.whereDetail}</span> : null}
    </div>
  );
}

function useComponentDocTocSections(componentName: string) {
  const { register, unregister } = useToc();
  const componentId = slugify(componentName);
  const displayName = formatUnfinishedComponentLabel(componentName);

  useEffect(() => {
    register({ id: componentId, title: displayName });
    return () => unregister(componentId);
  }, [componentId, displayName, register, unregister]);

  return { componentId };
}

function StorefrontPlaceholder({ componentName }: { componentName: string }) {
  return (
    <Surface padding="component">
      <div style={placeholderSurfaceStyle}>
        <span
          style={{ ...hds.typeStyles.technical, color: 'var(--semantic-color-content-primary)' }}
        >
          {componentName}
        </span>
        <span
          style={{
            ...hds.typeStyles.ui,
            color: 'var(--semantic-color-content-secondary)',
            textAlign: 'center',
          }}
        >
          Preview and documentation load when this specimen enters the viewport.
        </span>
      </div>
    </Surface>
  );
}

/** @public */
export function HdsComponentDoc({
  componentName,
  demo,
  matrix,
  props: propRows,
  description,
  layout = 'default',
  children,
  childrenPlacement = 'afterDetails',
  hideDetails = false,
  hideVariantDeck = false,
  hideHeroLabel = false,
  hideHero = false,
}: {
  componentName: string;
  demo?: ReactNode;
  matrix?: ReactNode;
  props?: ComponentPropRow[];
  description?: ReactNode;
  layout?: 'default' | 'utility';
  isDark?: boolean;
  children?: ReactNode;
  childrenPlacement?: 'beforeDetails' | 'afterDetails';
  hideDetails?: boolean;
  hideVariantDeck?: boolean;
  hideHeroLabel?: boolean;
  hideHero?: boolean;
}) {
  const manifestEntry = systemManifest.componentSpecs[componentName];
  const apiEntry = componentApi.components[componentName];
  const figmaUrl =
    manifestEntry?.figmaUrl && !/figma\.com\/hds-placeholder/i.test(manifestEntry.figmaUrl)
      ? manifestEntry.figmaUrl
      : null;
  const resolvedDescription =
    manifestEntry?.description ?? apiEntry?.description ?? description ?? '';
  const resolvedProps = propRows && propRows.length > 0 ? propRows : (apiEntry?.props ?? []);
  const resolvedGuides = apiEntry?.guides ?? [];
  const tokenMapping = manifestEntry?.tokenMapping ?? {};
  const mappedTokenRows = buildReflectiveTokenRows(
    tokenMapping,
    componentName,
    manifestEntry?.category,
  );
  const observedTokenRows = buildObservedTokenRows(
    apiEntry?.observedTokens ?? [],
    new Set(mappedTokenRows.map((row) => row.tokenPath)),
    componentName,
    manifestEntry?.category,
  );
  const tokenRows = [...mappedTokenRows, ...observedTokenRows];
  const hasTokens = layout !== 'utility' && tokenRows.length > 0;
  const hasProperties = resolvedProps.length > 0;
  const hasUsageNotes = resolvedGuides.length > 0;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [shouldHydrate, setShouldHydrate] = useState(false);
  const [activeTab, setActiveTab] = useState<ComponentDocTabId>('properties');
  const { componentId } = useComponentDocTocSections(componentName);

  const availableTabs = [
    hasProperties ? { id: 'properties' as const, label: 'Properties' } : null,
    hasTokens ? { id: 'tokens' as const, label: 'Tokens' } : null,
    hasUsageNotes ? { id: 'usage' as const, label: 'Usage' } : null,
  ].filter(Boolean) as Array<{ id: ComponentDocTabId; label: string }>;
  useEffect(() => {
    if (availableTabs.length === 0) return;
    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(availableTabs[0].id);
    }
  }, [activeTab, availableTabs]);

  useEffect(() => {
    if (layout === 'utility') return;

    const syncTabFromHash = () => {
      const hash = window.location.hash;
      const hashMap: Record<string, ComponentDocTabId> = {
        [`#${componentId}-properties`]: 'properties',
        [`#${componentId}-tokens`]: 'tokens',
        [`#${componentId}-usage`]: 'usage',
      };
      const nextTab = hashMap[hash];
      if (nextTab && availableTabs.some((tab) => tab.id === nextTab)) {
        setActiveTab(nextTab);
      }
    };

    syncTabFromHash();
    window.addEventListener('hashchange', syncTabFromHash);
    return () => window.removeEventListener('hashchange', syncTabFromHash);
  }, [availableTabs, componentId, layout]);

  useEffect(() => {
    const target = rootRef.current;
    if (!target || shouldHydrate || typeof IntersectionObserver === 'undefined') {
      if (!shouldHydrate) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShouldHydrate(true);
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldHydrate(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px 0px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [layout, shouldHydrate]);

  return (
    <div ref={rootRef}>
      <Stack gap="normal">
        <section id={componentId}>
          <Stack gap="tight" align="start">
            <TextLockup
              title={formatUnfinishedComponentLabel(componentName)}
              description={resolvedDescription || undefined}
              size="section"
            />
            {figmaUrl ? (
              <Button
                variant="secondary"
                size="md"
                asChild
                iconLeft={<Icon icon={FigmaLogo} size={14} color="currentColor" />}
              >
                <a href={figmaUrl} target="_blank" rel="noopener noreferrer">
                  View in Figma
                </a>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                disabled
                iconLeft={<Icon icon={FigmaLogo} size={14} color="currentColor" />}
              >
                View in Figma
              </Button>
            )}
          </Stack>
        </section>

        {shouldHydrate ? (
          <SpecimenBlock
            componentName={componentName}
            filePath={manifestEntry?.filePath ?? apiEntry?.filePath}
            demo={demo}
            matrix={matrix}
            hideVariantDeck={hideVariantDeck}
            hideHeroLabel={hideHeroLabel}
            hideHero={hideHero}
          />
        ) : (
          <PreviewFrame>
            <StorefrontPlaceholder componentName={componentName} />
          </PreviewFrame>
        )}
      </Stack>

      {childrenPlacement === 'beforeDetails' ? children : null}

      {!hideDetails && shouldHydrate && (hasProperties || hasTokens || hasUsageNotes) ? (
        layout === 'utility' ? (
          <div>
            {hasProperties ? (
              <Disclosure label="Properties" defaultOpen={false}>
                <Surface padding="component">
                  <Table
                    minWidth={640}
                    columns={PROP_TABLE_COLUMNS}
                    rows={buildPropTableRows(resolvedProps)}
                  />
                </Surface>
              </Disclosure>
            ) : null}

            {hasTokens ? (
              <Disclosure label="Tokens" defaultOpen={false}>
                <Surface padding="component">
                  <Table
                    columns={[
                      { key: 'token', label: 'Token', width: 'minmax(0, 6fr)' },
                      { key: 'source', label: 'Anatomy', width: 'minmax(0, 3fr)' },
                      { key: 'description', label: 'Description', width: 'minmax(0, 3fr)' },
                    ]}
                    rows={tokenRows.map((row) => ({
                      key: `${componentName}-${row.key}`,
                      cells: [
                        {
                          slot: 'token',
                          content: (
                            <Token variant="node" pathDisplayMode="full">
                              {row.tokenPath}
                            </Token>
                          ),
                        },
                        { slot: 'label', content: renderTokenAnatomy(row) },
                        { slot: 'description', content: row.description },
                      ],
                    }))}
                  />
                </Surface>
              </Disclosure>
            ) : null}

            {hasUsageNotes ? (
              <Disclosure label="Usage notes" defaultOpen={false}>
                <Surface padding="component">
                  {resolvedGuides.map((guide) => (
                    <Alert key={`${componentName}-${guide.label}`} tone="info" title={guide.label}>
                      {guide.text}
                    </Alert>
                  ))}
                </Surface>
              </Disclosure>
            ) : null}
          </div>
        ) : (
          <section>
            <div style={{ maxWidth: '100%' }}>
              <div
                style={{
                  width: `min(100%, calc(${hds.size[96]} * ${Math.max(availableTabs.length, 2)}))`,
                  maxWidth: '100%',
                }}
              >
                <SegmentedControl
                  aria-label={`${componentName} documentation sections`}
                  fullWidth
                  variant="secondary"
                  segmentPaddingX={hds.semantic.space.layout.gap}
                  options={availableTabs.map((tab) => ({ value: tab.id, label: tab.label }))}
                  value={activeTab}
                  onChange={(value) => setActiveTab(value as ComponentDocTabId)}
                  size="sm"
                  railPadding={hds.semantic.space.subgrid.gap}
                />
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {activeTab === 'properties' && hasProperties ? (
                <motion.section
                  key={`${componentName}-properties`}
                  id={`${componentId}-properties`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={tabPanelTransition}
                >
                  <Table
                    minWidth={640}
                    columns={PROP_TABLE_COLUMNS}
                    rows={buildPropTableRows(resolvedProps)}
                  />
                </motion.section>
              ) : null}

              {activeTab === 'tokens' && hasTokens ? (
                <motion.section
                  key={`${componentName}-tokens`}
                  id={`${componentId}-tokens`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={tabPanelTransition}
                >
                  <Table
                    columns={[
                      { key: 'token', label: 'Token', width: 'minmax(0, 6fr)' },
                      { key: 'source', label: 'Anatomy', width: 'minmax(0, 3fr)' },
                      { key: 'description', label: 'Description', width: 'minmax(0, 3fr)' },
                    ]}
                    rows={tokenRows.map((row) => ({
                      key: `${componentName}-${row.key}`,
                      cells: [
                        {
                          slot: 'token',
                          content: (
                            <Token variant="node" pathDisplayMode="full">
                              {row.tokenPath}
                            </Token>
                          ),
                        },
                        { slot: 'label', content: renderTokenAnatomy(row) },
                        { slot: 'description', content: row.description },
                      ],
                    }))}
                  />
                </motion.section>
              ) : null}

              {activeTab === 'usage' && hasUsageNotes ? (
                <motion.section
                  key={`${componentName}-usage`}
                  id={`${componentId}-usage`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={tabPanelTransition}
                >
                  {resolvedGuides.map((guide) => (
                    <Alert key={`${componentName}-${guide.label}`} tone="info" title={guide.label}>
                      {guide.text}
                    </Alert>
                  ))}
                </motion.section>
              ) : null}
            </AnimatePresence>
          </section>
        )
      ) : null}

      {childrenPlacement === 'afterDetails' ? children : null}
    </div>
  );
}
