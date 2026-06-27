/**
 * SpecimenBlock — shared component-doc specimen block with preview, variant deck, and optional matrix.
 *
 * @category Utilities
 * @tier primitive
 * @doc-exempt: shared doc-specimen composition used to render component docs, not a consumer-facing surface.
 */
import type { ReactNode } from 'react';
import systemManifestData from 'virtual:hds-manifest';
import type { SystemManifest } from '../data/manifest-types';
import hds from '../design-system/tokens';
import { PreviewFrame } from './preview-frame';
import { AutoPreviewSpecimen, VariantPreviewDeck } from './componentPreviewRegistry';

const systemManifest = systemManifestData as SystemManifest;

/** @public */
export function SpecimenBlock({
  componentName,
  filePath,
  demo,
  matrix,
  hideVariantDeck = false,
  hideHeroLabel = false,
  hideHero = false,
}: {
  componentName: string;
  filePath?: string;
  demo?: ReactNode;
  matrix?: ReactNode;
  hideVariantDeck?: boolean;
  hideHeroLabel?: boolean;
  hideHero?: boolean;
}) {
  const resolvedFilePath = filePath ?? systemManifest.componentSpecs?.[componentName]?.filePath;

  return (
    <div>
      {hideHero ? null : (
        <PreviewFrame {...(hideHeroLabel ? { label: '' } : {})}>
          {demo ?? (
            <AutoPreviewSpecimen componentName={componentName} filePath={resolvedFilePath} />
          )}
        </PreviewFrame>
      )}
      {hideVariantDeck ? null : (
        <VariantPreviewDeck componentName={componentName} filePath={resolvedFilePath} />
      )}
      {matrix ? (
        <div style={{ marginTop: hideHero ? 0 : `calc(${hds.semantic.space.component.gap} * 2)` }}>
          {matrix}
        </div>
      ) : null}
    </div>
  );
}
