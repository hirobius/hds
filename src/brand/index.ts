/**
 * @hirobius/design-system/brand — palette → HDS-semantic overlay bridge.
 *
 * Framework-free helpers that theme any render target (static Astro, SSR, email)
 * from a small brand palette while inheriting the HDS semantic contract. Imports
 * no React and no Node built-ins, so it is safe to pull into a build step or an
 * edge runtime. See ./overlay.ts and docs on the Astro consumption path.
 */
export { brandOverlayVars, brandOverlayStyle, brandOverlayCss, type BrandPalette } from './overlay';
