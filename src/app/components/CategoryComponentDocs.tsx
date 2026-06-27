/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
// @doc-exempt: documentation orchestration helper - renders manifest-backed component docs by category
// motion-ok: this orchestration helper delegates interaction feedback to the child HDS components it renders rather than animating at the wrapper level
import type { ReactNode } from 'react';
import systemManifestData from 'virtual:hds-manifest';
import type { SystemManifest } from '../data/manifest-types';
import { DocSection, HdsComponentDoc } from '../pages/hds/HdsDocPrimitives';
import { Stack } from './stack';

type ComponentDocConfig = {
  matrix?: ReactNode;
  description?: string;
  layout?: 'default' | 'utility';
  children?: ReactNode;
};

const systemManifest = systemManifestData as SystemManifest;

export function getCategoryComponentNames(category: string, preferredOrder: string[]) {
  const names = (systemManifest.componentInventory ?? []).filter((name) => {
    const spec = systemManifest.componentSpecs?.[name];
    return spec?.category === category && spec?.hidden !== true;
  });

  const orderLookup = new Map(preferredOrder.map((name, index) => [name, index]));

  return names.sort((a, b) => {
    const orderA = orderLookup.has(a) ? orderLookup.get(a)! : Number.MAX_SAFE_INTEGER;
    const orderB = orderLookup.has(b) ? orderLookup.get(b)! : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });
}

export function CategoryComponentDocs({
  category,
  isDark,
  preferredOrder = [],
  configs = {},
  defaultLayout = 'default',
  hideDetails = false,
  hideVariantDeck = false,
  hideHeroLabel = false,
  hideHero = false,
}: {
  category: string;
  isDark: boolean;
  preferredOrder?: string[];
  configs?: Record<string, ComponentDocConfig>;
  defaultLayout?: 'default' | 'utility';
  hideDetails?: boolean;
  hideVariantDeck?: boolean;
  hideHeroLabel?: boolean;
  hideHero?: boolean;
}) {
  const componentNames = getCategoryComponentNames(category, preferredOrder);

  return (
    <Stack gap="spacious">
      {componentNames.map((componentName) => {
        const config = configs[componentName] ?? {};

        return (
          <DocSection key={componentName} isDark={isDark} noBorder>
            <HdsComponentDoc
              componentName={componentName}
              isDark={isDark}
              matrix={config.matrix}
              description={config.description}
              layout={config.layout ?? defaultLayout}
              hideDetails={hideDetails}
              hideVariantDeck={hideVariantDeck}
              hideHeroLabel={hideHeroLabel}
              hideHero={hideHero}
            >
              {config.children}
            </HdsComponentDoc>
          </DocSection>
        );
      })}
    </Stack>
  );
}
