import type { ComponentApiManifest, ManifestUsage } from '../../app/data/manifest-types';

/**
 * Storybook autodocs description with the component's usage contract appended.
 *
 * Storybook's own extractor gives the docgen description; the @usage /
 * @whenNot / @useInstead JSDoc tags never reach it, so an agent or human
 * reading the Docs tab could not see when to pick a component (hds#339). The
 * contract comes from src/app/data/component-api.json.
 */

/** The docgen description followed by the usage block, as Markdown. */
export function withUsageBlock(description: string, usage: ManifestUsage | undefined): string {
  const parts: string[] = [];
  if (usage?.when) parts.push(`**When to use:** ${usage.when}`);
  if (usage?.whenNot) parts.push(`**When not:** ${usage.whenNot}`);
  if (usage?.useInstead?.length) {
    const items = usage.useInstead.map((entry) =>
      entry.reason ? `\`${entry.component}\` (${entry.reason})` : `\`${entry.component}\``,
    );
    parts.push(`**Use instead:** ${items.join(', ')}`);
  }
  return [description, ...parts].filter(Boolean).join('\n\n');
}

type DocgenComponent = {
  displayName?: string;
  __docgenInfo?: { displayName?: string; description?: string };
};

/**
 * `parameters.docs.extractComponentDescription` for .storybook/preview.tsx.
 * Pass the component-api manifest in, so this stays free of the generated file.
 */
export function extractUsageDescription(
  component: DocgenComponent | undefined,
  api: ComponentApiManifest,
): string {
  if (!component) return '';
  const description = component.__docgenInfo?.description ?? '';
  const name = component.displayName ?? component.__docgenInfo?.displayName;
  return withUsageBlock(description, name ? api.components?.[name]?.usage : undefined);
}
