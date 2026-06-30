import { useTheme } from '../../context/ThemeContext';
import { ct } from '../../design-system/theme';
import hds from '../../design-system/tokens';
import breakpointsData from '../../data/foundations/breakpoints.json';
import { Token } from '../../components/token';
import { Table } from '../../components/table';
import { Stack } from '../../components/stack';
import { Surface } from '../../components/surface';
import { Text } from '../../components/text';
import { HdsFoundationSection, useIsMobile } from './HdsDocPrimitives';
import { FoundationDocPage } from './FoundationDocPage';

type BreakpointRow = {
  name: string;
  px: number;
  token: string;
  utility: string;
  notes: string;
};

type BreakpointsFoundationData = {
  breakpoints: BreakpointRow[];
  maxPx: number;
};

const { breakpoints: BP_ROWS, maxPx: MAX_PX } = breakpointsData as BreakpointsFoundationData;
const XL_BREAKPOINT_PX = BP_ROWS.find((bp) => bp.name === 'xl')?.px ?? MAX_PX;

// Component-scoped dimension vars — no hds.size token exists for 2px / 4px.
const BP_TRACK_HEIGHT = 4;
const BP_TICK_WIDTH = 2;

const breakpointRulerStyle = {
  position: 'relative',
  width: '100%',
  height: 72,
  marginBottom: hds.semantic.space.layout.gap,
} as const;

const bpTrackStyle = {
  position: 'absolute' as const,
  top: hds.semantic.space.layout.gap,
  left: 0,
  height: BP_TRACK_HEIGHT,
  borderRadius: hds.borderRadius[2],
} as const;

const breakpointMarkerStyle = {
  position: 'absolute' as const,
  top: 0,
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  gap: hds.semantic.space.subgrid.gap,
} as const;

const breakpointTickStyle = {
  width: BP_TICK_WIDTH,
  height: hds.size[20],
} as const;

const breakpointMetaRowStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: hds.semantic.space.subgrid.gap,
  marginBottom: hds.semantic.space.subgrid.gap,
} as const;

function BreakpointRuler({ isDark }: { isDark: boolean }) {
  const t = ct(isDark);
  const xlPct = (XL_BREAKPOINT_PX / MAX_PX) * 100;
  const tickColor = isDark ? hds.color.blue['200'] : hds.color.blue['300'];
  const tailColor = isDark ? hds.color.blue['800'] : hds.color.blue['200'];
  return (
    <div style={breakpointRulerStyle}>
      <div
        style={{
          ...bpTrackStyle,
          width: `${xlPct}%`,
          background: t.accent,
        }}
      />
      <div
        style={{
          ...bpTrackStyle,
          left: `${xlPct}%`,
          width: `calc(100% - ${xlPct}%)`,
          background: tailColor,
        }}
      />
      {BP_ROWS.map((bp) => {
        const pct = (bp.px / MAX_PX) * 100;
        return (
          <div key={bp.name} style={{ ...breakpointMarkerStyle, left: `${pct}%` }}>
            <span style={{ ...hds.typeStyles.technical, whiteSpace: 'nowrap' }}>{bp.name}</span>
            <Surface padding="item" style={{ ...breakpointTickStyle, background: tickColor }} />
            <span
              className="text-primary"
              style={{ ...hds.typeStyles.technical, whiteSpace: 'nowrap' }}
            >
              {bp.px}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function BreakpointsPage() {
  const { isDark } = useTheme();
  const isMobile = useIsMobile();

  return (
    <FoundationDocPage
      title="Breakpoints"
      description="Five named breakpoints define the responsive layout scale. The documented px values are used in both JS checks and CSS media queries."
    >
      <HdsFoundationSection
        title="Breakpoint ruler"
        intro="The responsive scale is small on purpose so layout changes stay predictable across documentation and product surfaces."
        marginTop={0}
      >
        <BreakpointRuler isDark={isDark} />

        {isMobile ? (
          <Stack gap="gap">
            {BP_ROWS.map((bp) => (
              <Stack key={bp.name} gap="xs">
                <div style={breakpointMetaRowStyle}>
                  <Text
                    variant="heading3"
                    as="span"
                    style={{ color: 'var(--semantic-color-content-primary)' }}
                  >
                    {bp.name}
                  </Text>
                  <Text
                    variant="body"
                    as="span"
                    style={{
                      color: 'var(--semantic-color-content-secondary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {bp.px}px
                  </Text>
                  {bp.utility !== '-' && (
                    <Text
                      variant="caption"
                      as="span"
                      style={{
                        color: 'var(--semantic-color-content-disabled)',
                        marginLeft: 'auto',
                      }}
                    >
                      {bp.utility}
                    </Text>
                  )}
                </div>
                <div>
                  <Token variant="node">{bp.token}</Token>
                </div>
                <Text
                  variant="caption"
                  as="p"
                  style={{ color: 'var(--semantic-color-content-secondary)' }}
                >
                  {bp.notes}
                </Text>
              </Stack>
            ))}
          </Stack>
        ) : (
          <>
            <Table
              caption="Breakpoint reference"
              columns={[
                { key: 'token', label: 'Token', width: '36%' },
                { key: 'px', label: 'Min width', width: '14%' },
                { key: 'notes', label: 'Layout behavior', width: '50%' },
              ]}
              rows={BP_ROWS.map((bp) => ({
                key: bp.name,
                cells: [
                  { slot: 'token', content: <Token variant="node">{bp.token}</Token> },
                  { slot: 'code', content: bp.px },
                  { slot: 'description', content: bp.notes },
                ],
              }))}
            />
          </>
        )}
        <Text
          variant="body"
          as="p"
          style={{
            color: 'var(--semantic-color-content-secondary)',
            maxWidth: hds.size.width['760'],
          }}
        >
          Breakpoints control layout shifts, not component identity. Use the same named values in
          CSS and JS, and avoid page-specific width rules when a named breakpoint already exists.
        </Text>
      </HdsFoundationSection>
    </FoundationDocPage>
  );
}

// ADR-017 nav metadata — drives the generated nav-model.json (see scripts/generate-nav-model.mjs).
export const meta = {
  path: '/breakpoints',
  title: 'Breakpoints',
  section: 'Foundations',
  order: 7,
} satisfies import('../../data/nav-model').HdsPageMeta;
