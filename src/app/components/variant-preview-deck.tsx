/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
// @doc-exempt: variant preview helper used by docs pages, not a consumer-facing HDS surface.
/**
 * VariantPreviewDeck - preview deck for size/tone/variant families.
 * @category Utilities
 */
import systemManifestData from 'virtual:hds-manifest';
import type { SystemManifest } from '../data/manifest-types';
import { VariantPreviewDeck as VariantPreviewDeckImpl } from './componentPreviewRegistry';

const systemManifest = systemManifestData as SystemManifest;

export function VariantPreviewDeck({
  componentName,
  filePath,
}: {
  componentName: string;
  filePath?: string;
}) {
  const resolvedFilePath = filePath ?? systemManifest.componentSpecs?.[componentName]?.filePath;
  return <VariantPreviewDeckImpl componentName={componentName} filePath={resolvedFilePath} />;
}
