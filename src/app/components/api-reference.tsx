/**
 * ApiReference — collapsed inline API reference for primitive/pattern doc pages.
 * @category Utilities
 * @tier utility
 *
 * 9d-8 baseline: a single <details> block, closed by default, mounted at the
 * bottom of every primitive/pattern doc page (mounting itself is 9d-9). Reads
 * `componentSpec.props + propConstraints + slots[]` straight from the live HDS
 * manifest (`virtual:hds-manifest`) and falls back to `component-api.json` for
 * per-prop descriptions (the manifest carries shape, not JSDoc text).
 *
 * Columns: name, type, default, description, required.
 *
 * Design contract:
 *   - Native <details>/<summary> — no JS toggle, no animation, no extra deps.
 *     Matches the 9d-5 "Show Code" pattern: cheap, accessible, keyboard-native.
 *   - Surface from role tokens only (border, content, surface) — no hex.
 *   - Templates SKIP this block (templates compose primitives — link out
 *     instead). Adrian-ratified judgment call 2026-05-01.
 *   - Doc-tier internal scaffolding, not part of the public HDS authoring
 *     surface (mirrors DocShell / SpecimenBlock conventions).
 */

// @doc-exempt: doc-tier scaffolding rendered at the bottom of generated component docs; not a consumer surface.

import * as React from 'react';
import systemManifestData from 'virtual:hds-manifest';
import componentApiManifest from '../data/component-api.json';
import hds from '../design-system/tokens';

// ── Manifest types (narrow to the fields this component reads) ────────────────

type ManifestPropSpec = {
  type?: string;
  values?: Array<string | number | boolean>;
  default?: string | number | boolean;
  optional?: boolean;
};

type ManifestSlot = {
  name?: string;
  figmaSlotName?: string;
  tokenBinding?: Record<string, string>;
};

type ManifestComponentSpec = {
  tier?: string;
  props?: Record<string, ManifestPropSpec>;
  propConstraints?: Record<string, ManifestPropSpec>;
  requiredProps?: string[];
  slots?: ManifestSlot[];
};

type SystemManifest = {
  componentSpecs?: Record<string, ManifestComponentSpec>;
};

type ApiPropEntry = {
  name: string;
  type?: string;
  default?: string;
  required?: boolean;
  description?: string;
};

type ComponentApiManifest = {
  components?: Record<string, {
    props?: ApiPropEntry[];
  }>;
};

const MANIFEST = systemManifestData as SystemManifest;
const COMPONENT_API = componentApiManifest as ComponentApiManifest;

// ── Row shape rendered by this component ──────────────────────────────────────

type ApiRow = {
  name: string;
  type: string;
  default: string;
  description: string;
  required: boolean;
};

// ── Derivation helpers ────────────────────────────────────────────────────────

function formatType(spec: ManifestPropSpec | undefined): string {
  if (!spec) return '';
  if (spec.type === 'enum' && Array.isArray(spec.values) && spec.values.length > 0) {
    return spec.values
      .map((v) => (typeof v === 'string' ? `'${v}'` : String(v)))
      .join(' | ');
  }
  return spec.type ?? '';
}

function formatDefault(spec: ManifestPropSpec | undefined): string {
  if (!spec || spec.default === undefined) return '';
  if (typeof spec.default === 'string') return `'${spec.default}'`;
  return String(spec.default);
}

/**
 * Merge manifest componentSpec.props with propConstraints (narrows enum
 * shapes when only constraints carry them) and component-api.json descriptions.
 * Required is sourced from componentSpec.requiredProps (canonical) with a
 * conservative fallback to !optional on the prop spec.
 */
export function buildApiRowsFromManifest(componentName: string): ApiRow[] {
  const spec = MANIFEST.componentSpecs?.[componentName];
  if (!spec) return [];

  const props = spec.props ?? {};
  const constraints = spec.propConstraints ?? {};
  const requiredSet = new Set(spec.requiredProps ?? []);
  const apiProps = COMPONENT_API.components?.[componentName]?.props ?? [];
  const descriptionByName = new Map<string, string>();
  for (const entry of apiProps) {
    if (entry?.name && entry.description) {
      descriptionByName.set(entry.name, entry.description);
    }
  }

  const propNames = new Set<string>([
    ...Object.keys(props),
    ...Object.keys(constraints),
  ]);

  const rows: ApiRow[] = [];
  for (const name of propNames) {
    const propSpec = props[name];
    const constraintSpec = constraints[name];

    // Prefer the prop spec for default + optional, but fall back to the
    // constraint spec for `type`/`values` if the prop spec is missing them.
    const mergedType =
      formatType(propSpec) || formatType(constraintSpec) || formatType({ type: 'unknown' });
    const isOptionalFromSpec = propSpec?.optional === true;
    const _isRequired = requiredSet.has(name) || (!isOptionalFromSpec && !requiredSet.size && false);

    rows.push({
      name,
      type: mergedType,
      default: formatDefault(propSpec),
      description: descriptionByName.get(name) ?? '',
      // requiredProps[] is the canonical source. If a component has empty
      // requiredProps, treat all as optional (matches manifest semantics).
      required: requiredSet.has(name),
    });
  }

  rows.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return rows;
}

// ── Render ────────────────────────────────────────────────────────────────────

const cellHeaderStyle: React.CSSProperties = {
  ...hds.typeStyles.eyebrow,
  color: 'var(--semantic-color-content-secondary)',
  textAlign: 'left',
  paddingTop: hds.semantic.space.subgrid.gap,
  paddingBottom: hds.semantic.space.subgrid.gap,
  paddingInlineEnd: hds.semantic.space.component.gap,
  borderBottom: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
};

const cellBodyStyle: React.CSSProperties = {
  ...hds.typeStyles.ui,
  color: 'var(--semantic-color-content-primary)',
  textAlign: 'left',
  paddingTop: hds.semantic.space.component.gap,
  paddingBottom: hds.semantic.space.component.gap,
  paddingInlineEnd: hds.semantic.space.component.gap,
  borderBottom: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
  verticalAlign: 'top',
};

const codeCellStyle: React.CSSProperties = {
  ...cellBodyStyle,
  ...hds.typeStyles.technical,
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  color: 'var(--semantic-color-content-primary)',
};

const summaryStyle: React.CSSProperties = {
  ...hds.typeStyles.ui,
  color: 'var(--semantic-color-content-secondary)',
  cursor: 'pointer',
  listStyle: 'none',
  paddingBlock: hds.semantic.space.component.gap,
  paddingInline: 0,
  display: 'flex',
  alignItems: 'center',
  gap: hds.semantic.space.component.gap,
};

const detailsStyle: React.CSSProperties = {
  borderTop: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
  marginBlockStart: hds.semantic.space.section.stack,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBlockEnd: hds.semantic.space.component.gap,
};

const emptyNoteStyle: React.CSSProperties = {
  ...hds.typeStyles.ui,
  color: 'var(--semantic-color-content-secondary)',
  marginBlock: hds.semantic.space.component.gap,
};

const requiredBadgeStyle: React.CSSProperties = {
  ...hds.typeStyles.caption,
  color: 'var(--semantic-color-content-accent)',
  marginInlineStart: hds.semantic.space.subgrid.xs,
};

const slotListStyle: React.CSSProperties = {
  ...hds.typeStyles.technical,
  color: 'var(--semantic-color-content-primary)',
  marginBlock: hds.semantic.space.component.gap,
  paddingInlineStart: hds.semantic.space.section.stack,
};

const slotsHeadingStyle: React.CSSProperties = {
  ...hds.typeStyles.eyebrow,
  color: 'var(--semantic-color-content-secondary)',
  marginBlockEnd: hds.semantic.space.subgrid.gap,
};

interface ApiReferenceProps {
  /** Manifest key for the component being documented (e.g. "Button"). */
  componentName: string;
  /**
   * Override the default summary label. Defaults to "API reference".
   */
  label?: string;
  /**
   * Force-render even when the resolved tier is "template". Templates skip
   * this block by default (Adrian-ratified 2026-05-01) — they compose
   * primitives, so the reference belongs on the primitive doc page, not the
   * template doc page. Pass `true` only if a template legitimately ships
   * its own first-party props that consumers must read.
   */
  forceForTemplate?: boolean;
}

/**
 * ApiReference — collapsed <details> rendering of a component's public API.
 * Returns `null` when:
 *   - The component is missing from the manifest (nothing to render).
 *   - The component is a template and `forceForTemplate` is not set.
 *   - The component has no props AND no slots (genuinely empty surface).
 */
export function ApiReference({
  componentName,
  label = 'API reference',
  forceForTemplate = false,
}: ApiReferenceProps) {
  const spec = MANIFEST.componentSpecs?.[componentName];
  if (!spec) return null;

  if (spec.tier === 'template' && !forceForTemplate) {
    return null;
  }

  const rows = buildApiRowsFromManifest(componentName);
  const slots = (spec.slots ?? []).filter((s) => s && (s.name || s.figmaSlotName));

  if (rows.length === 0 && slots.length === 0) {
    return null;
  }

  const propsTableId = `${componentName}-api-reference-props`;
  const slotsListId = `${componentName}-api-reference-slots`;

  return (
    <details style={detailsStyle} data-hds-api-reference={componentName}>
      <summary
        className="hds-focus"
        style={summaryStyle}
        aria-label={`${label} for ${componentName}`}
      >
        {label}
        <span style={{ ...hds.typeStyles.caption, color: 'var(--semantic-color-content-secondary)' }}>
          {rows.length > 0 ? `${rows.length} prop${rows.length === 1 ? '' : 's'}` : ''}
          {rows.length > 0 && slots.length > 0 ? ' · ' : ''}
          {slots.length > 0 ? `${slots.length} slot${slots.length === 1 ? '' : 's'}` : ''}
        </span>
      </summary>

      {rows.length > 0 ? (
        <table id={propsTableId} style={tableStyle}>
          <thead>
            <tr>
              <th style={cellHeaderStyle} scope="col">Name</th>
              <th style={cellHeaderStyle} scope="col">Type</th>
              <th style={cellHeaderStyle} scope="col">Default</th>
              <th style={cellHeaderStyle} scope="col">Description</th>
              <th style={cellHeaderStyle} scope="col">Required</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td style={codeCellStyle}>
                  {row.name}
                  {row.required ? <span style={requiredBadgeStyle} aria-hidden="true">*</span> : null}
                </td>
                <td style={codeCellStyle}>{row.type || '—'}</td>
                <td style={codeCellStyle}>{row.default || '—'}</td>
                <td style={cellBodyStyle}>{row.description || '—'}</td>
                <td style={cellBodyStyle}>{row.required ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={emptyNoteStyle}>This component exposes no first-party props.</p>
      )}

      {slots.length > 0 ? (
        <div>
          <p style={slotsHeadingStyle}>Slots</p>
          <ul id={slotsListId} style={slotListStyle}>
            {slots.map((slot, idx) => {
              const slotName = slot.name ?? slot.figmaSlotName ?? `slot-${idx}`;
              return (
                <li key={slotName}>
                  {slotName}
                  {slot.figmaSlotName && slot.figmaSlotName !== slotName ? (
                    <span style={{ color: 'var(--semantic-color-content-secondary)' }}>
                      {` (Figma: ${slot.figmaSlotName})`}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </details>
  );
}

export default ApiReference;
