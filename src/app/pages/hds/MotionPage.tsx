import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import hds from '../../design-system/tokens';
import motionData from '../../data/foundations/motion.json';
import { Token } from '../../components/token';
import { Table } from '../../components/table';
import { Surface } from '../../components/surface';
import { Stack } from '../../components/stack';
import { Text } from '../../components/text';
import { HdsFoundationSection, HdsFoundationTableStack, DocFinePrint } from './HdsDocPrimitives';
import { FoundationDocPage } from './FoundationDocPage';

type MotionPrinciple = { title: string; body: string; description: string; token: string };
type MotionDuration  = { key: string; value: string; ms: number; description: string };
type MotionCurve     = {
  key: string; label: string; values: string;
  curve: [number, number, number, number]; description: string;
  spring?: { stiffness: number; damping: number; mass: number };
};
type MotionFoundationData = {
  principles: MotionPrinciple[];
  durationSteps: MotionDuration[];
  easingCurves: MotionCurve[];
  uiSamples: unknown[];
};

const DATA    = motionData as MotionFoundationData;
const MOTION_STAGE_PADDING = hds.semantic.space.component.padding;
const MOTION_CAPTION_OFFSET = hds.semantic.space.component.gap;
const MOTION_LABEL_CLEARANCE = hds.size[32];
const motionCenterStageStyle = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  width:          '100%',
  height:         '100%',
} as const;
const motionSpatialStageStyle = {
  ...motionCenterStageStyle,
  overflow: 'hidden',
} as const;
const motionPrincipleFigureStyle = {
  display:       'flex',
  flexDirection: 'column',
  minWidth:      0,
  gap:           MOTION_CAPTION_OFFSET,
  margin:        0,
} as const;
const motionStageStyle = {
  position:        'absolute',
  top:             MOTION_STAGE_PADDING,
  right:           MOTION_STAGE_PADDING,
  bottom:          `calc(${MOTION_STAGE_PADDING} + ${MOTION_LABEL_CLEARANCE})`,
  left:            MOTION_STAGE_PADDING,
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  minWidth:        0,
} as const;
const motionTokenDockStyle = {
  position:        'absolute',
  left:            MOTION_STAGE_PADDING,
  bottom:          MOTION_STAGE_PADDING,
  display:         'flex',
  alignItems:      'flex-end',
  justifyContent:  'flex-start',
  minWidth:        0,
} as const;
const motionCaptionStyle = {
  ...hds.typeStyles.caption,
  margin: 0,
  color:  'var(--semantic-color-content-secondary)',
} as const;

// ── Cycle hook ────────────────────────────────────────────────────────────────

function useToggleCycle(visibleMs: number, hiddenMs: number) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let active = true;
    const run = async () => {
      while (active) {
        await new Promise<void>(r => setTimeout(r, visibleMs));
        if (!active) break;
        setVisible(false);
        await new Promise<void>(r => setTimeout(r, hiddenMs));
        if (!active) break;
        setVisible(true);
      }
    };
    run();
    return () => { active = false; };
  }, [visibleMs, hiddenMs]);
  return visible;
}

// ── Shared demo asset ─────────────────────────────────────────────────────────

const ACCENT = 'var(--semantic-accent-rest)';
const ASSET_STYLE = {
  width: 40,
  height: 40,
  borderRadius: hds.borderRadius[8],
  background: ACCENT,
  flexShrink: 0,
} as const;

// ── Preview atoms ─────────────────────────────────────────────────────────────

function ProductivePreview() {
  const visible = useToggleCycle(1400, 500);
  return (
    <div style={motionCenterStageStyle}>
      <AnimatePresence>
        {visible && (
          <motion.div
            key="p"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
            style={ASSET_STYLE}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExpressivePreview() {
  const visible = useToggleCycle(1800, 700);
  return (
    <div style={motionCenterStageStyle}>
      <AnimatePresence>
        {visible && (
          <motion.div
            key="e"
            initial={{ opacity: 0, scale: 0.84 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.84 }}
            transition={hds.motion.expressive.easing}
            style={ASSET_STYLE}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SpatialPreview() {
  return (
    <div style={motionSpatialStageStyle}>
      <motion.div
        animate={{ x: [-56, 56] }}
        transition={{
          duration: hds.motion.spatial.duration,
          ease: hds.motion.spatial.easing,
          repeat: Infinity,
          repeatType: 'reverse',
          repeatDelay: 0.4,
        }}
        style={ASSET_STYLE}
      />
    </div>
  );
}

function ExitPreview() {
  const visible = useToggleCycle(1400, 700);
  return (
    <div style={motionCenterStageStyle}>
      <AnimatePresence>
        {visible && (
          <motion.div
            key="x"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: hds.motion.exit.duration, ease: hds.motion.exit.easing }}
            style={ASSET_STYLE}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Demo card ─────────────────────────────────────────────────────────────────

function getPreview(token: string) {
  const key = token.split('.').pop();
  if (key === 'productive') return <ProductivePreview />;
  if (key === 'expressive') return <ExpressivePreview />;
  if (key === 'spatial')    return <SpatialPreview />;
  return <ExitPreview />;
}

function MotionPrincipleCard({ principle }: { principle: MotionPrinciple }) {
  return (
    <figure
      style={motionPrincipleFigureStyle}
    >
      <Surface padding="component" style={{ position: 'relative', minHeight: 220 }}>
        <div style={motionStageStyle}>
          {getPreview(principle.token)}
        </div>

        <Surface padding="item" style={motionTokenDockStyle}>
          <Token variant="node" pathDisplayMode="compressed" pathDisplayDepth={1}>
            {principle.token}
          </Token>
        </Surface>
      </Surface>

      <figcaption>
        <Text variant="caption" as="p" style={motionCaptionStyle}>
          {principle.body}
        </Text>
        <Text variant="caption" as="p" style={motionCaptionStyle}>
          {principle.description}
        </Text>
      </figcaption>
    </figure>
  );
}


// ── Page ──────────────────────────────────────────────────────────────────────

export default function MotionPage() {
  const { isDark } = useTheme();
  void isDark;

  return (
    <FoundationDocPage
      title="Motion"
      description="Motion stays calm and purposeful. The token set keeps timing consistent across the UI."
    >
      <HdsFoundationSection
        title="Semantic motion"
        intro="Semantic intents keep interaction timing consistent without inventing page-level animation rules."
        marginTop={0}
      >
            <Stack gap="px24">
              {DATA.principles.map(p => (
                <MotionPrincipleCard key={p.token} principle={p} />
              ))}
            </Stack>
      </HdsFoundationSection>

      <HdsFoundationSection
        title="Primitives"
        intro="Primitive durations and easing curves power the semantic layer without drifting from a governed timing scale."
      >
            <DocFinePrint label="Primitive token tables">
            <HdsFoundationTableStack marginTop={0}>
              <Table
                caption="Duration scale"
                description="The base timing steps stay small and predictable."
                columns={[
                  { key: 'token', label: 'Token', width: '40%' },
                  { key: 'description', label: 'Description', width: '60%' },
                ]}
                rows={DATA.durationSteps.map(step => ({
                  key: step.key,
                  cells: [
                    {
                      slot: 'token',
                      content: (
                        <Token variant="node" pathDisplayMode="compressed" pathDisplayDepth={1}>
                          primitive.duration.{step.key}
                        </Token>
                      ),
                    },
                    { slot: 'description', content: step.description },
                  ],
                }))}
              />

              <Table
                caption="Easing curves"
                description="Primitive easing values that semantic motion tokens reference."
                columns={[
                  { key: 'token', label: 'Token', width: '40%' },
                  { key: 'description', label: 'Description', width: '60%' },
                ]}
                rows={DATA.easingCurves.map(curve => {
                  return ({
                    key: curve.key,
                    cells: [
                      {
                        slot: 'token',
                        content: (
                          <Token variant="node" pathDisplayMode="compressed" pathDisplayDepth={1} tokenPath={`primitive.easing.${curve.key}`}>
                            primitive.easing.{curve.key}
                          </Token>
                        ),
                      },
                      { slot: 'description', content: curve.description },
                    ],
                  });
                })}
              />
            </HdsFoundationTableStack>
            </DocFinePrint>
      </HdsFoundationSection>
    </FoundationDocPage>
  );
}
