// motion-ok: preview registry — onClick handlers are internal demo wiring, not user-facing
/** @internal @doc-exempt: demo-preview-helper — not part of @hirobius/design-system public API. */
import { useEffect, useState, type ElementType } from 'react';
import { GitBranch, SlidersHorizontal, Sparkle } from 'lucide-react';
import systemManifestData from 'virtual:hds-manifest';
import componentApiManifest from '../data/component-api.json';
import hds from '../design-system/tokens';
import { Button } from './button';
import { PreviewFrame } from './preview-frame';
import { allTokens } from './lab/tokenUtils';

type PreviewSizingProfile = 'compact' | 'panel' | 'full';

type ComponentPreviewSpec = {
  exportName?: string;
  sizing?: PreviewSizingProfile;
};

type SystemManifest = {
  componentSpecs?: Record<
    string,
    {
      filePath?: string;
      preview?: ComponentPreviewSpec;
    }
  >;
};

type ComponentApiManifest = {
  components?: Record<
    string,
    {
      props?: Array<{
        name: string;
        type?: string;
        default?: string;
        required?: boolean;
        description?: string;
      }>;
    }
  >;
};

const systemManifest = systemManifestData as SystemManifest;
const componentApi = componentApiManifest as ComponentApiManifest;
const previewVariantPropNames = new Set(['size', 'tone', 'variant']);

const componentModules = {
  ...import.meta.glob('./*.tsx'),
  ...import.meta.glob('./lab/*.tsx'),
};

const sampleToken = allTokens[0] ?? null;
const sampleTokenSections = sampleToken
  ? [{ key: 'sample', label: 'Sample tokens', items: allTokens.slice(0, 6) }]
  : [];
const sampleAssetSrc = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" aria-hidden="true" focusable="false">
    <rect width="800" height="600" fill="var(--semantic-color-surface-page)" />
    <rect x="120" y="100" width="560" height="400" fill="var(--semantic-accent-rest)" opacity="0.12" />
    <rect x="180" y="160" width="440" height="280" fill="var(--semantic-accent-rest)" opacity="0.24" />
  </svg>
`)}`;

function getPreviewSizingStyle(profile: PreviewSizingProfile) {
  switch (profile) {
    case 'compact':
      return {
        ['display']: 'grid',
        justifyItems: 'start',
        width: '100%',
        maxWidth: 320, // audit-ok: responsive container dimension derived from grid layout, not token-backed
      };
    case 'full':
      return {
        ['display']: 'grid',
        width: '100%',
      };
    case 'panel':
    default:
      return {
        ['display']: 'grid',
        justifyItems: 'start',
        width: '100%',
        maxWidth: 480, // audit-ok: responsive container dimension derived from grid layout, not token-backed
      };
  }
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function extractLiteralUnionValues(type?: string) {
  if (!type) return [];
  const matches = [...type.matchAll(/'([^']+)'|"([^"]+)"|`([^`]+)`/g)]
    .map((match) => match[1] ?? match[2] ?? match[3] ?? '')
    .filter(Boolean);
  return [...new Set(matches)];
}

export type PreviewVariantGroup = {
  key: string;
  label: string;
  propName: string;
  values: Array<{
    value: string;
    label: string;
  }>;
};

export function getPreviewVariantGroups(componentName: string): PreviewVariantGroup[] {
  const props = componentApi.components?.[componentName]?.props ?? [];

  return props.flatMap((prop) => {
    if (!previewVariantPropNames.has(prop.name)) return [];
    const values = extractLiteralUnionValues(prop.type);
    if (values.length < 2) return [];

    return [
      {
        key: prop.name,
        label: titleCase(prop.name),
        propName: prop.name,
        values: values.map((value) => ({
          value,
          label: titleCase(value),
        })),
      },
    ];
  });
}

function getDefaultPreviewProps(componentName: string) {
  switch (componentName) {
    case 'ControlsPanel':
      return {
        title: 'Controls',
        placement: 'stacked',
        children: <span>Preview controls</span>,
      };
    case 'ComponentPreview':
      return {
        component: function UtilityPreviewCard() {
          return (
            <div>
              <span
                style={{
                  ...hds.typeStyles.technical,
                  color: 'var(--semantic-color-content-primary)',
                }}
              >
                Preview target
              </span>
              <span
                style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-secondary)' }}
              >
                Utility-hosted specimen rendered through the preview harness.
              </span>
            </div>
          );
        },
      };
    case 'Alert':
      return {
        variant: 'info',
        title: 'Ready',
        children: 'Use alerts for compact system status and editorial context.',
      };
    case 'Badge':
      return {
        tone: 'neutral',
        children: 'Canvas',
      };
    case 'ControlsSection':
      return {
        title: 'Section title',
        description: 'Preview description',
        children: <span>Section controls</span>,
      };
    case 'AnimatedLabel':
      return {
        children: 'Explore docs',
      };
    case 'HdsSidebarUtilityButton':
      return {
        onClick: () => undefined,
        icon: SlidersHorizontal,
        label: 'Utility button',
      };
    case 'HdsMobileTopBar':
      return {
        onToggleSidebar: () => undefined,
        sidebarOpen: false,
        mobileTopbarHeight: 56,
        directionToggleEnabled: false,
        previewMode: true,
        shellCopy: {
          layoutDirection: 'Layout direction',
          openNavigation: 'Open navigation',
          closeNavigation: 'Close navigation',
        },
      };
    case 'CinematicLink':
      return {
        href: '#',
        children: 'Preview link',
      };
    case 'InfoPage':
      return {
        isDark: false,
      };
    case 'StepperField':
      return {
        label: 'Density',
        value: 8,
        min: 0,
        max: 16,
        step: 1,
        onChange: () => undefined,
      };
    case 'Disclosure':
      return {
        label: 'What ships in the shell?',
        children: (
          <div>
            <span
              style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-secondary)' }}
            >
              Default disclosure content lives behind the trigger until the user opens it.
            </span>
          </div>
        ),
      };
    case 'NavGroup':
      return {
        label: 'Hirobius Design System',
        variant: 'side',
        items: [
          { path: '#overview', label: 'Overview' },
          { path: '#components', label: 'Components' },
        ],
      };
    case 'Stack':
      return {
        children: (
          <div>
            <span style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-primary)' }}>
              Item A
            </span>
            <span style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-primary)' }}>
              Item B
            </span>
          </div>
        ),
      };
    case 'Divider':
      return {};
    case 'Button':
      return {
        children: 'Save changes',
      };
    case 'DocLinkCard':
      return {
        title: 'Microsoft Design Systems',
        description: 'Production-system case study entry with richer summary copy and metadata.',
        href: '/portfolio/microsoft-design-systems',
        icon: GitBranch,
        meta: 'Primary case study',
        variant: 'feature',
      };
    case 'HistoryCard':
      return {
        commit: {
          hash: '8ac256d',
          date: '2026-04-21T20:04:16.285Z',
          message: 'sync',
          displayMessage: 'Generated data refresh',
        },
        href: 'https://github.com/hirobius/adrian-milsap/commit/8ac256d',
      };
    case 'IconButton':
      return {
        icon: Sparkle,
        'aria-label': 'Preview icon button',
      };
    case 'Input':
      return {
        label: 'Search tokens',
      };
    case 'NavItem':
      return {
        variant: 'side',
        label: 'Color',
        href: '/color',
        active: false,
        indent: 'root',
      };
    case 'InlineLink':
      return {
        href: '/color',
        children: 'Color',
      };
    case 'InlineCode':
      return {
        children: 'semantic.color.content.primary',
      };
    case 'CodeBlock':
      return {
        variant: 'block',
        filename: 'tokens.ts',
        language: 'typescript',
        code: `import hds from '../design-system/tokens';\n\nconst heading = {\n  ...hds.typeStyles.heading1,\n  color: 'var(--semantic-color-content-primary)',\n};`,
      };
    case 'Icon':
      return {
        icon: Sparkle,
        size: 'small',
        color: 'currentColor',
      };
    case 'HdsSlider':
      return {
        label: 'Particle count',
        min: 0,
        max: 100,
        value: 50,
        onChange: () => undefined,
      };
    case 'HdsRadio':
      return {
        label: 'Grid view',
        checked: false,
        onChange: () => undefined,
      };
    case 'HdsToggle':
      return {
        label: 'Cursor awareness',
        checked: false,
        onChange: () => undefined,
      };
    case 'SegmentedControl':
      return {
        label: 'Force mode',
        value: 'attract',
        onChange: () => undefined,
        options: [
          { value: 'attract', label: 'Attract' },
          { value: 'repel', label: 'Repel' },
          { value: 'flow', label: 'Flow' },
        ],
      };
    case 'HdsSelect':
      return {
        label: 'Color mode',
        value: 'brand',
        onChange: () => undefined,
        options: [
          { value: 'brand', label: 'Brand' },
          { value: 'neutral', label: 'Neutral' },
        ],
      };
    case 'Tag':
      return {
        children: 'Tag',
      };
    case 'MobiusLogo':
      return {
        allowGrab: false,
        style: { width: '240px', height: '240px' },
      };
    case 'AssetImg':
      return {
        src: sampleAssetSrc,
        alt: 'Preview asset',
        context: 'default',
        expandable: false,
      };
    case 'TokenList':
    case 'LegacyTokenList':
      return {
        tokens: allTokens.slice(0, 6),
        selectedPath: sampleToken?.path ?? null,
        onSelect: () => undefined,
      };
    case 'TokenDetail':
    case 'LegacyTokenDetail':
      return {
        token: sampleToken,
        isDark: false,
        onSelectToken: () => undefined,
      };
    case 'HdsLegacyTokenGovernancePanel':
      return {
        token: sampleToken,
        isDark: false,
      };
    case 'TokenCollectionList':
      return {
        sections: sampleTokenSections,
        selectedPath: sampleToken?.path ?? null,
        onSelect: () => undefined,
      };
    case 'Token':
      return {
        variant: 'node',
        children: sampleToken?.path ?? 'primitive.color.blue.500',
        pathDisplayMode: 'compressed',
        pathDisplayDepth: 1,
      };
    case 'TextLockup':
      return {
        eyebrow: 'Display',
        title: 'Governed text pairing',
        description:
          'Title, supporting copy, and optional eyebrow flow through one reusable layout primitive.',
        size: 'section',
        align: 'left',
      };
    case 'HdsComponentDoc':
      return {
        componentName: 'Button',
        layout: 'utility',
        description:
          'The shared storefront shell used to render title, description, preview, tokens, props, and usage notes from generated data.',
      };
    case 'SpecimenBlock':
      return {
        componentName: 'Button',
      };
    case 'VariantPreviewDeck':
      return {
        componentName: 'Button',
      };
    case 'PreviewFrame':
      return {
        label: 'Preview',
        children: (
          <div>
            <span
              style={{
                ...hds.typeStyles.technical,
                color: 'var(--semantic-color-content-primary)',
              }}
            >
              Preview content
            </span>
            <span
              style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-secondary)' }}
            >
              Shared preview chrome for storefront specimens.
            </span>
          </div>
        ),
      };
    case 'Table':
      return {
        caption: 'Utility slot specimen',
        description: 'A compact slice of the shared table grammar.',
        columns: [
          { key: 'slot', label: 'Slot', width: '22%' },
          { key: 'example', label: 'Example', width: '28%' },
          { key: 'notes', label: 'Notes', width: '50%' },
        ],
        rows: [
          {
            key: 'label',
            cells: [
              { slot: 'label', content: 'label' },
              { slot: 'label', content: 'Section label' },
              { slot: 'description', content: 'Descriptive cells for lightweight text content.' },
            ],
          },
          {
            key: 'code',
            cells: [
              { slot: 'label', content: 'code' },
              { slot: 'code', content: 'var(--semantic-color-content-primary)' },
              { slot: 'description', content: 'Technical values stay monospace and compact.' },
            ],
          },
          {
            key: 'action',
            cells: [
              { slot: 'label', content: 'action' },
              {
                slot: 'action',
                content: (
                  <div style={{ display: 'flex', gap: hds.space.px8 }}>
                    <Button size="sm">Copy</Button>
                    <Button variant="secondary" size="sm">
                      Open
                    </Button>
                  </div>
                ),
              },
              {
                slot: 'description',
                content:
                  'Action cells can host grouped controls without leaving the shared table grammar.',
              },
            ],
          },
        ],
      };
    case 'ComponentInstanceMatrix':
      return {
        componentName: 'Button',
        dimensionX: 'variant',
        dimensionY: 'size',
        title: 'Button matrix',
        isMobile: false,
        rowLabelWidth: 88,
        renderInstance: (rowKey, columnKey) => (
          <Button
            variant={rowKey as 'primary' | 'secondary' | 'tertiary'}
            size={columnKey as 'sm' | 'md' | 'lg'}
          >
            {rowKey} / {columnKey}
          </Button>
        ),
      };
    case 'FoundationSwatch':
      return {
        label: 'blue.500',
        tokenPath: 'primitive.color.blue.500',
        previewPosition: 'top-left',
        // tier-ok: foundation swatch preview intentionally displays primitive source values for token education.
        value: 'var(--primitive-color-blue-500)',
        // tier-ok: foundation swatch preview intentionally displays primitive source values for token education.
        background: 'var(--primitive-color-blue-500)',
        // tier-ok: foundation swatch preview intentionally displays primitive source values for token education.
        foreground: 'var(--semantic-color-content-onAccent)',
      };
    default:
      return {};
  }
}

export function AutoPreviewSpecimen({
  componentName,
  filePath,
  overrideProps,
}: {
  componentName: string;
  filePath?: string;
  overrideProps?: Record<string, unknown>;
}) {
  const [LoadedComponent, setLoadedComponent] = useState<ElementType | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const previewSpec = systemManifest.componentSpecs?.[componentName]?.preview;
  const sizingProfile = previewSpec?.sizing ?? 'panel';
  const previewSizingStyle = getPreviewSizingStyle(sizingProfile);
  const exportName = previewSpec?.exportName ?? componentName;

  useEffect(() => {
    const moduleKey = filePath?.startsWith('src/app/components/')
      ? `./${filePath.replace(/^src\/app\/components\//, '')}`
      : null;
    if (!moduleKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadFailed(true);
      return;
    }

    const loader = componentModules[moduleKey];
    if (!loader) {
      setLoadFailed(true);
      return;
    }

    let cancelled = false;
    setLoadFailed(false);

    loader()
      .then((mod) => {
        if (cancelled) return;
        const resolved =
          (mod as Record<string, unknown>)[exportName] ??
          (mod as Record<string, unknown>)[componentName] ??
          (mod as { default?: unknown }).default;
        if (resolved) {
          setLoadedComponent(() => resolved as ElementType);
          return;
        }
        setLoadFailed(true);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [componentName, exportName, filePath]);

  const baseProps = {
    ...getDefaultPreviewProps(componentName),
    ...(overrideProps ?? {}),
  };

  if (LoadedComponent) {
    return (
      <div style={previewSizingStyle}>
        <LoadedComponent {...baseProps} />
      </div>
    );
  }

  if (loadFailed) {
    return <span>Preview unavailable</span>;
  }

  return <span>Loading preview…</span>;
}

export function VariantPreviewDeck({
  componentName,
  filePath,
}: {
  componentName: string;
  filePath?: string;
}) {
  const variantGroups = getPreviewVariantGroups(componentName);

  if (variantGroups.length === 0) {
    return null;
  }

  return (
    <div>
      {variantGroups.map((group) => (
        <section key={group.key}>
          <span style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-primary)' }}>
            {group.label}
          </span>
          <div>
            {group.values.map((option) => (
              <div key={`${group.key}-${option.value}`}>
                <span
                  style={{
                    ...hds.typeStyles.caption,
                    color: 'var(--semantic-color-content-secondary)',
                  }}
                >
                  {option.label}
                </span>
                <PreviewFrame>
                  <AutoPreviewSpecimen
                    componentName={componentName}
                    filePath={filePath}
                    overrideProps={{ [group.propName]: option.value }}
                  />
                </PreviewFrame>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
