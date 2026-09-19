/**
 * Storybook `parameters.design` for a component, read from its one Figma
 * source: `componentSpecs[<Name>].figmaUrl` in public/hds-manifest.json, which
 * `pnpm manifest:generate` sets from the component's `@figma` JSDoc tag.
 *
 * Spread it into a story file's meta parameters:
 *
 *     parameters: { ...designParameters('<Name>'), layout: 'padded' }
 *
 * Never write a Figma URL in a story; `pnpm figma:links --check` (and its test)
 * fails on one. A component without a node gets `{}`, so wiring a story before
 * its node URL exists is harmless. @storybook/addon-designs renders the value
 * as the Design tab.
 */
import manifest from '../../public/hds-manifest.json';

export type DesignParameters = { design?: { type: 'figma'; url: string } };

const specs =
  (manifest as unknown as { componentSpecs?: Record<string, { figmaUrl?: string | null }> })
    .componentSpecs ?? {};

const FIGMA_URL = /^https:\/\/(www\.)?figma\.com\//;

/** `parameters.design` for one Figma URL; `{}` for anything that is not a figma.com URL. */
export function figmaDesignParameter(url: unknown): DesignParameters {
  return typeof url === 'string' && FIGMA_URL.test(url) ? { design: { type: 'figma', url } } : {};
}

export function designParameters(component: string): DesignParameters {
  return figmaDesignParameter(specs[component]?.figmaUrl);
}
