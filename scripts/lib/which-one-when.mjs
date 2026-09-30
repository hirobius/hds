/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * which-one-when.mjs — the compact "Which one when" lines for llms.txt.
 *
 * One line per non-hidden component that has `usage.when`, sorted by name:
 *   `Name: when. Use instead: A, B`
 * The `Use instead:` tail is left off when the component names no alternative.
 * A spec with `core: true` (the hds#254 core set, hds#374) reads
 *   `Name: [core] when. …`
 * so the name stays first and line parsers keyed on `Name: ` keep working.
 */

/**
 * @param {Record<string, { hidden?: boolean, core?: boolean, usage?: { when?: string, useInstead?: Array<{component: string}> } }>} specs
 * @returns {string} newline-joined lines, or '' when no component is tagged
 */
export function buildWhichOneWhen(specs) {
  return Object.entries(specs)
    .filter(([, spec]) => !spec?.hidden && spec?.usage?.when)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, spec]) => {
      const when = spec.usage.when.replace(/[.\s]+$/, '');
      const instead = (spec.usage.useInstead ?? []).map((entry) => entry.component);
      const core = spec.core === true ? '[core] ' : '';
      return `${name}: ${core}${when}.${instead.length ? ` Use instead: ${instead.join(', ')}` : ''}`;
    })
    .join('\n');
}
