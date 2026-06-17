import hds from '../../design-system/tokens';
import { tokenRefs } from '../../design-system/generated-token-refs';
import { FoundationSwatch } from '../../components/foundation-swatch';
import { Grid } from '../../components/grid';
import { Table } from '../../components/table';
import { Token } from '../../components/token';
import {
  HdsFoundationSection,
  HdsFoundationTableStack,
  useIsMobile,
} from './HdsDocPrimitives';
import { FoundationDocPage } from './FoundationDocPage';

const BORDER_USE: Record<string, string> = {
  subdued: 'Quiet separation where division is implied, not announced.',
  default: 'Default borders for cards, inputs, and standard rules.',
  strong: 'Higher-contrast rules and emphasized separation.',
  accent: 'Focus rings, active indicators, and brand-driven edges.',
};

const BORDER_TOKENS = Object.entries(tokenRefs.semantic.color.border).map(([key, cssVar]) => ({
  key,
  token: `semantic.color.border.${key}`,
  cssVar: cssVar as string,
  use: BORDER_USE[key] ?? 'Shared semantic border role.',
}));

const RADIUS_ALIAS_ROWS = [
  {
    alias: 'primitive.radius.0',
    resolvesTo: '0px',
    use: 'Structural blocks and full-bleed media.',
    radius: hds.borderRadius[0],
  },
  {
    alias: 'primitive.radius.2',
    resolvesTo: '2px',
    use: 'Tight inner elements and small controls.',
    radius: hds.borderRadius[2],
  },
  {
    alias: 'primitive.radius.4',
    resolvesTo: '4px',
    use: 'Feedback surfaces and compact geometry.',
    radius: hds.borderRadius[4],
  },
  {
    alias: 'primitive.radius.8',
    resolvesTo: '8px',
    use: 'Cards, dialogs, and larger surfaces.',
    radius: hds.borderRadius[8],
  },
  {
    alias: 'primitive.radius.full',
    resolvesTo: '9999px',
    use: 'Pills, badges, and circular treatments.',
    radius: hds.borderRadius.full,
  },
  {
    alias: 'semantic.radius.action',
    resolvesTo: '4px',
    use: 'Buttons, fields, and interactive controls.',
    radius: hds.borderRadius.action,
  },
] as const;

function RadiusPreview({
  radius,
  resolvesTo,
}: {
  radius: string;
  resolvesTo: string;
}) {
  const isPill = resolvesTo === '9999px';

  return (
    <div
      aria-hidden="true"
      style={{
        width: isPill ? hds.size[96] : hds.size[80],
        height: isPill ? hds.size[48] : hds.size[80],
        borderRadius: radius,
        border: `1px solid var(--semantic-color-border-default)`,
        background: 'var(--semantic-accent-rest)',
      }}
    />
  );
}

function BorderPreview({ color }: { color: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: hds.size[80],
        height: hds.size[80],
        borderRadius: hds.borderRadius.action,
        border: `2px solid ${color}`,
        background: 'var(--semantic-color-surface-raised)',
      }}
    />
  );
}

export default function ShapePage() {
  const isMobile = useIsMobile();
  const swatchColSpan = isMobile ? 6 : 3;

  return (
    <FoundationDocPage
      title="Shape"
      description="Shape stays restrained: value-based primitive radii for geometry, semantic action radius for controls, and border roles that stay token-governed."
    >
      <HdsFoundationSection
        title="Radius scale"
        intro="Primitive radii define geometry. The semantic action radius is the control-level rule that keeps interactive surfaces consistent."
        marginTop={0}
      >
        <Grid columns={12} gap="normal">
          {RADIUS_ALIAS_ROWS.map((radius) => (
            <Grid.Item key={radius.alias} colSpan={swatchColSpan}>
              <FoundationSwatch
                label={radius.alias.split('.').slice(-1)[0]}
                tokenPath={radius.alias}
                tokenDisplayPreset="full"
                previewPosition="center"
                background="var(--semantic-color-surface-raised)"
                bordered={true}
                specimen={<RadiusPreview radius={radius.radius} resolvesTo={radius.resolvesTo} />}
                note={`${radius.resolvesTo} - ${radius.use}`}
              />
            </Grid.Item>
          ))}
        </Grid>
      </HdsFoundationSection>

      <HdsFoundationSection
        title="Border roles"
        intro="Border color aliases let surfaces communicate structure, emphasis, and interaction without hardcoded color drift."
      >
        <Grid columns={12} gap="normal">
          {BORDER_TOKENS.map((border) => (
            <Grid.Item key={border.token} colSpan={swatchColSpan}>
              <FoundationSwatch
                label={border.key}
                tokenPath={border.token}
                tokenDisplayPreset="depth2"
                previewPosition="center"
                background="var(--semantic-color-surface-raised)"
                bordered={true}
                specimen={<BorderPreview color={border.cssVar} />}
                note={border.use}
              />
            </Grid.Item>
          ))}
        </Grid>
      </HdsFoundationSection>

      <HdsFoundationSection
        title="Usage matrix"
        intro="The table view keeps the geometry rules explicit so implementation work can resolve directly back to tokens and intended use."
      >
        <HdsFoundationTableStack marginTop={0}>
          <Table
            caption="Radius aliases"
            columns={[
              { key: 'token', label: 'Token', width: '34%' },
              { key: 'preview', label: 'Preview', width: '16%' },
              { key: 'value', label: 'Resolves to', width: '16%' },
              { key: 'use', label: 'Use', width: '34%' },
            ]}
            rows={RADIUS_ALIAS_ROWS.map((radius) => ({
              key: radius.alias,
              cells: [
                {
                  slot: 'token',
                  content: (
                    <Token variant="node" pathDisplayMode="full">
                      {radius.alias}
                    </Token>
                  ),
                },
                {
                  slot: 'custom',
                  content: <RadiusPreview radius={radius.radius} resolvesTo={radius.resolvesTo} />,
                },
                { slot: 'code', content: radius.resolvesTo },
                { slot: 'description', content: radius.use },
              ],
            }))}
          />

          <Table
            caption="Border aliases"
            columns={[
              { key: 'token', label: 'Token', width: '34%' },
              { key: 'preview', label: 'Preview', width: '16%' },
              { key: 'use', label: 'Use', width: '50%' },
            ]}
            rows={BORDER_TOKENS.map((border) => ({
              key: border.token,
              cells: [
                {
                  slot: 'token',
                  content: (
                    <Token variant="node" pathDisplayMode="compressed" pathDisplayDepth={1}>
                      {border.token}
                    </Token>
                  ),
                },
                { slot: 'custom', content: <BorderPreview color={border.cssVar} /> },
                { slot: 'description', content: border.use },
              ],
            }))}
          />
        </HdsFoundationTableStack>
      </HdsFoundationSection>
    </FoundationDocPage>
  );
}
