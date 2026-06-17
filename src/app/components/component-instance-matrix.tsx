/**
 * ComponentInstanceMatrix — responsive specimen matrix for variant and state parity.
 *
 * @category Utilities
 * @tier primitive
 * @doc-exempt: specimen matrix helper used by docs pages, not a consumer-facing HDS surface.
 */
import React from 'react';
import componentApiManifest from '../data/component-api.json';
import hds from '../design-system/tokens';
import { FreezeState } from '../context/DemoStateContext';

type ComponentApiManifest = {
  components: Record<string, {
    props: Array<{
      name: string;
      type: string;
    }>;
  }>;
};

type MatrixOption = {
  key: string;
  label: string;
};

const componentApi = componentApiManifest as ComponentApiManifest;
const SYNTHETIC_DIMENSION_OPTIONS: Record<string, MatrixOption[]> = {
  demoState: [
    { key: 'rest', label: 'Rest' },
    { key: 'hover', label: 'Hover' },
    { key: 'focused', label: 'Focus' },
    { key: 'pressed', label: 'Pressed' },
    { key: 'disabled', label: 'Disabled' },
  ],
};

function toTitleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function parseLiteralOptions(type: string | undefined): MatrixOption[] | null {
  if (!type) return null;
  const normalized = type.trim();
  if (normalized === 'boolean') {
    return [
      { key: 'false', label: 'False' },
      { key: 'true', label: 'True' },
    ];
  }

  const optionParts = normalized
    .split('|')
    .map(part => part.trim())
    .filter(Boolean);

  const options = optionParts
    .map(part => {
      const literal = part.match(/^['"](.*)['"]$/)?.[1];
      if (literal) {
        return { key: literal, label: literal };
      }
      return null;
    })
    .filter((option): option is MatrixOption => Boolean(option));

  return options.length > 0 ? options : null;
}

function resolveMatrixOptions(componentName: string, dimension: string) {
  const syntheticOptions = SYNTHETIC_DIMENSION_OPTIONS[dimension];
  if (syntheticOptions) return syntheticOptions;
  const componentEntry = componentApi.components[componentName];
  const prop = componentEntry?.props.find(entry => entry.name === dimension);
  return parseLiteralOptions(prop?.type) ?? [];
}

function toMatrixLabel(dimension: string) {
  return toTitleCase(dimension);
}

/** @public */
export function ComponentInstanceMatrix({
  componentName,
  dimensionX,
  dimensionY,
  title,
  isMobile: _isMobile,
  rowLabelWidth: _rowLabelWidth = 120,
  rowLabelTone = 'primary',
  freezeRowState = false,
  renderInstance,
}: {
  componentName: string;
  dimensionX: string;
  dimensionY: string;
  title?: string;
  isMobile: boolean;
  rowLabelWidth?: number;
  rowLabelTone?: 'primary' | 'secondary';
  /** Wrap each row's rendered instance in FreezeState so the visual state is frozen. */
  freezeRowState?: boolean;
  renderInstance: (rowKey: string, columnKey: string) => React.ReactNode;
}) {
  const resolvedColumnOptions = resolveMatrixOptions(componentName, dimensionX);
  const resolvedRowOptions = resolveMatrixOptions(componentName, dimensionY);
  const _rowLabel = toMatrixLabel(dimensionY);
  const hasColumns = resolvedColumnOptions.length > 0;
  const hasRows = resolvedRowOptions.length > 0;

  if (!hasColumns || !hasRows) {
    return null;
  }

  return (
    <section>
      {title ? (
        <p style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-primary)', margin: 0 }}>
          {title}
        </p>
      ) : null}
      <div>
        {resolvedColumnOptions.map((column) => (
          <section
            key={column.key}>
            <p style={{ ...hds.typeStyles.technical, color: 'var(--semantic-color-content-primary)', margin: 0, paddingBottom: hds.semantic.space.layout.gap }}>
              {column.label}
            </p>
            <div>
              {resolvedRowOptions.map((row) => (
                <div
                  key={`${row.key}-${column.key}`}>
                  <p style={{ ...hds.typeStyles.technical, color: rowLabelTone === 'secondary' ? 'var(--semantic-color-content-secondary)' : 'var(--semantic-color-content-primary)', margin: 0 }}>
                    {row.label}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', minWidth: 0 }}>
                    {freezeRowState
                      ? <FreezeState state={row.key}>{renderInstance(row.key, column.key)}</FreezeState>
                      : renderInstance(row.key, column.key)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

