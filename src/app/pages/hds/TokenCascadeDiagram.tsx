/**
 * TokenCascadeDiagram — visualises the primitive → semantic → component
 * token cascade. Three columns of node boxes connected by SVG bezier curves
 * computed after layout via useLayoutEffect + ResizeObserver.
 *
 * Interactive: hover any node to highlight its full cascade chain.
 * Dimmed nodes/edges fade to 15% opacity; active chain stays full opacity.
 */

import { useRef, useState, useLayoutEffect, useCallback } from 'react';
import hds from '../../design-system/tokens';
import { tokenValues } from '../../design-system/generated-token-values';
import { Token } from '../../components/token';
import { Grid } from '../../components/grid';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tier      = 'primitive' | 'semantic' | 'component';
type EdgeStyle = 'solid' | 'dashed';

interface NodeDef { id: string; tier: Tier; label: string; value: string; }
interface EdgeDef { from: string; to: string; label?: string; style?: EdgeStyle; }
interface Pt      { x: number; y: number; }
interface PathDef { d: string; mid: Pt; label?: string; style: EdgeStyle; fromId: string; toId: string; }

// ── Data ──────────────────────────────────────────────────────────────────────

const NODES: NodeDef[] = [
  // Primitives
  { id: 'p-blue-500',    tier: 'primitive', label: 'color.blue.500',       value: tokenValues.primitive.color.blue['500'] },
  { id: 'p-blue-400',    tier: 'primitive', label: 'color.blue.400',       value: tokenValues.primitive.color.blue['400'] },
  { id: 'p-neutral-0',   tier: 'primitive', label: 'color.neutral.0',      value: tokenValues.primitive.color.neutral.white },
  { id: 'p-neutral-950', tier: 'primitive', label: 'color.neutral.950',    value: tokenValues.primitive.color.neutral['950'] },
  { id: 'p-typography-size', tier: 'primitive', label: 'typography.size.base', value: '16px'      },
  { id: 'p-radius-xs',   tier: 'primitive', label: 'radius.xs',            value: '4px'       },
  // Semantics
  { id: 's-surface-brand', tier: 'semantic',  label: 'color.surface.accent', value: '→ blue.500'           },
  { id: 's-content-brand',  tier: 'semantic',  label: 'color.content.accent',   value: 'light: 500 / dark: 400' },
  { id: 's-content-pri',    tier: 'semantic',  label: 'color.content.primary', value: 'light: .950 / dark: .0' },
  { id: 's-body-type',   tier: 'semantic',  label: 'typography.body',      value: '→ typography.size.base' },
  // Components
  { id: 'c-btn-bg',      tier: 'component', label: 'button.bg',            value: '→ color.surface.accent' },
  { id: 'c-btn-text',    tier: 'component', label: 'button.text',          value: '→ color.neutral.white (direct)' },
  { id: 'c-tag-text',    tier: 'component', label: 'tag.text',             value: '→ color.content.accent'   },
  { id: 'c-body-font',   tier: 'component', label: 'body.fontSize',       value: '→ typography.body' },
];

const EDGES: EdgeDef[] = [
  // Primitive → Semantic
  { from: 'p-blue-500',    to: 's-surface-brand'  },
  { from: 'p-blue-500',    to: 's-content-brand', label: 'light' },
  { from: 'p-blue-400',    to: 's-content-brand', label: 'dark',   style: 'dashed' },
  { from: 'p-neutral-950', to: 's-content-pri',   label: 'light' },
  { from: 'p-neutral-0',   to: 's-content-pri',   label: 'dark',   style: 'dashed' },
  { from: 'p-typography-size',   to: 's-body-type' },
  // Semantic → Component
  { from: 's-surface-brand',   to: 'c-btn-bg'    },
  { from: 's-content-brand', to: 'c-tag-text'  },
  { from: 's-body-type',  to: 'c-body-font' },
  // Direct Primitive → Component (skip semantic)
  { from: 'p-neutral-0',  to: 'c-btn-text',   label: 'direct', style: 'dashed' },
];

// ── Cascade helpers ───────────────────────────────────────────────────────────

/**
 * Build a set of all node IDs that are in the cascade chain for a given node.
 * Walk both upstream (toward primitives) and downstream (toward components).
 */
function getCascadeChain(nodeId: string): Set<string> {
  const chain = new Set<string>([nodeId]);

  // Walk upstream: nodeId as "to" → find all "from" nodes
  function walkUp(id: string) {
    for (const edge of EDGES) {
      if (edge.to === id && !chain.has(edge.from)) {
        chain.add(edge.from);
        walkUp(edge.from);
      }
    }
  }

  // Walk downstream: nodeId as "from" → find all "to" nodes
  function walkDown(id: string) {
    for (const edge of EDGES) {
      if (edge.from === id && !chain.has(edge.to)) {
        chain.add(edge.to);
        walkDown(edge.to);
      }
    }
  }

  walkUp(nodeId);
  walkDown(nodeId);
  return chain;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIERS: Tier[] = ['primitive', 'semantic', 'component'];

const TIER_LABEL: Record<Tier, string> = {
  primitive: 'PRIMITIVE',
  semantic:  'SEMANTIC',
  component: 'COMPONENT',
};

// Tier headers use one shared content token for consistent column labeling.  // audit-ok: CSS var references only
const TIER_ACCENT: Record<Tier, string> = {
  primitive: 'var(--semantic-color-content-primary)',
  semantic:  'var(--semantic-color-content-primary)',
  component: 'var(--semantic-color-content-primary)',
};

// ── Bezier helpers ────────────────────────────────────────────────────────────

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function bezierMid(p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt {
  const t  = 0.5;
  const q0 = lerp(p0, p1, t), q1 = lerp(p1, p2, t), q2 = lerp(p2, p3, t);
  const r0 = lerp(q0, q1, t), r1 = lerp(q1, q2, t);
  return lerp(r0, r1, t);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TokenCascadeDiagram({ isDark }: { isDark: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs     = useRef<Map<string, HTMLElement>>(new Map());
  const [paths, setPaths] = useState<PathDef[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Derived cascade chain from hover target
  const activeChain = hoveredId ? getCascadeChain(hoveredId) : null;

  const compute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cr = container.getBoundingClientRect();
    const next: PathDef[] = [];

    for (const edge of EDGES) {
      const fEl = nodeRefs.current.get(edge.from);
      const tEl = nodeRefs.current.get(edge.to);
      if (!fEl || !tEl) continue;

      const fr = fEl.getBoundingClientRect();
      const tr = tEl.getBoundingClientRect();

      const x1 = fr.right  - cr.left;
      const y1 = fr.top + fr.height / 2 - cr.top;
      const x2 = tr.left   - cr.left;
      const y2 = tr.top + tr.height / 2 - cr.top;
      const dx = (x2 - x1) * 0.5;

      const p0: Pt = { x: x1,      y: y1 };
      const p1: Pt = { x: x1 + dx, y: y1 };
      const p2: Pt = { x: x2 - dx, y: y2 };
      const p3: Pt = { x: x2,      y: y2 };

      next.push({
        d:     `M ${x1},${y1} C ${p1.x},${p1.y} ${p2.x},${p2.y} ${x2},${y2}`,
        mid:   bezierMid(p0, p1, p2, p3),
        label: edge.label,
        style: edge.style ?? 'solid',
        fromId: edge.from,
        toId:   edge.to,
      });
    }

    setPaths(next);
  }, []);

  useLayoutEffect(() => {
    compute();
    const obs = new ResizeObserver(compute);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [compute]);

  const curveStrokeBase = isDark
    ? 'color-mix(in srgb, var(--semantic-color-content-inverse) 14%, transparent)'
    : 'color-mix(in srgb, var(--semantic-color-content-primary) 11%, transparent)';

  const curveStrokeActive = isDark
    ? 'color-mix(in srgb, var(--semantic-color-content-inverse) 55%, transparent)'
    : 'color-mix(in srgb, var(--semantic-color-content-primary) 45%, transparent)';

  const labelFill   = 'var(--semantic-color-content-disabled)';

  return (
    // Horizontal scroll on narrow viewports — the SVG bezier paths between
    // columns are computed from DOM positions, so vertical stacking would
    // require re-architecting the measurement logic. Scroll is intentional here.
    // grid-ok: horizontal scroll is the correct pattern for this live SVG diagram
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div ref={containerRef} data-inspector-ignore="architecture-diagram" style={{ position: 'relative', minWidth: 520 }}>

        {/* Three-column grid — nodes render inside, SVG curves rendered on top */}
        <Grid
          columns={3}
          style={{
            gap: hds.semantic.space.layout.gap,
            alignItems: 'start',
          }}
        >
          {TIERS.map(tier => (
            <div key={tier} style={{ display: 'flex', flexDirection: 'column', gap: hds.semantic.space.component.gap }}>
              <p
                style={{
                  ...hds.typeStyles.ui,
                  color:  TIER_ACCENT[tier],
                  margin: 0,
                  opacity: activeChain && !NODES.filter(n => n.tier === tier).some(n => activeChain.has(n.id))
                    ? 0.2
                    : 1,
                  transition: 'opacity 0.18s ease',
                  letterSpacing: '0.08em',
                }}
              >
                {TIER_LABEL[tier]}
              </p>

              {NODES.filter(n => n.tier === tier).map(node => {
                const isActive   = !activeChain || activeChain.has(node.id);
                const isHovered  = node.id === hoveredId;

                return (
                  <div
                    key={node.id}
                    style={{
                      opacity:    isActive ? 1 : 0.12,
                      transition: 'opacity 0.18s ease',
                      cursor:     'default',
                    }}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <Token
                      variant="node"
                      fullWidth
                      tokenPath={node.label}
                      isSelected={isHovered}
                      nodeRef={el => {
                        if (el) nodeRefs.current.set(node.id, el);
                        else    nodeRefs.current.delete(node.id);
                      }}
                    >
                      {node.label}
                    </Token>
                  </div>
                );
              })}
            </div>
          ))}
        </Grid>

        {/* SVG bezier overlay — renders above columns */}
        <svg
          aria-hidden="true"
          style={{
            position:      'absolute',
            top:           0,
            left:          0,
            width:         '100%',
            height:        '100%',
            pointerEvents: 'none',
            overflow:      'visible',
            zIndex:        'var(--hds-z-raised)',
          }}
        >
          {paths.map((p, i) => {
            const edgeInChain = !activeChain || (activeChain.has(p.fromId) && activeChain.has(p.toId));
            const stroke = edgeInChain ? curveStrokeActive : curveStrokeBase;
            const strokeOpacity = activeChain && !edgeInChain ? 0.12 : 1;

            return (
              <g
                key={i}
                style={{
                  transition: 'opacity 0.18s ease',
                  opacity: strokeOpacity,
                }}
              >
                <path
                  d={p.d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={edgeInChain && activeChain ? 1.5 : 1}
                  strokeDasharray={p.style === 'dashed' ? '4 3' : undefined}
                />
                {p.label && (
                  <text
                    x={p.mid.x}
                    y={p.mid.y - 5}
                    textAnchor="middle"
                    fontSize={9}
                    // tier-ok: SVG text-primary element — no semantic font-family token exists; diagram intentionally renders at primitive tier
                    fontFamily="var(--primitive-typography-family-mono)"
                    fill={labelFill}
                  >
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
