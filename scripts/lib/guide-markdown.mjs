/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * guide-markdown.mjs — the "pick by need" list, rendered once from
 * mcp/guide.mjs for every document that carries it (the packaged AGENTS.md and
 * llms.txt), so the two cannot give an agent different answers.
 * scripts/__tests__/generate-agents-md.test.mjs checks both committed files
 * contain exactly this text.
 */
import { HOOKS, INTENTS } from '../../mcp/guide.mjs';

const code = (name) => `\`${name}\``;

/**
 * One bullet per need: the components to use, what agents reached for instead,
 * and one line of usage. Throws when the guide names a component the API data
 * lacks, so a rename cannot leave a dead recommendation behind.
 *
 * @param {Record<string, unknown>} components component-api.json `components`
 * @returns {string}
 */
export function needsMarkdown(components, patternNames = []) {
  for (const intent of INTENTS) {
    for (const name of intent.use) {
      if (!components[name] && !HOOKS[name]) {
        throw new Error(
          `mcp/guide.mjs names "${name}" (${intent.id}), which component-api.json lacks`,
        );
      }
    }
  }
  const patternSet = new Set(patternNames);
  return INTENTS.map((i) => {
    const patternComps = i.use.filter((name) => patternSet.has(name));
    const rootComps = i.use.filter((name) => !patternSet.has(name));

    let importLine = '';
    if (patternComps.length > 0) {
      const patsStr = patternComps.join(', ');
      const restStr =
        rootComps.length > 0 ? "';` the rest from `@hirobius/design-system`." : "';`";
      importLine = `\n  Import: \`import { ${patsStr} } from '@hirobius/design-system/patterns${restStr}`;
    }

    return `- **${i.need}** → ${i.use.map(code).join(', ')}. Not: ${i.avoid
      .map((a) => (/^[A-Z][A-Za-z]+$/.test(a) ? code(a) : a))
      .join(', ')}.\n  ${i.how}${importLine}`;
  }).join('\n');
}

export const NEEDS_INTRO =
  'One answer per need. Use the components after the arrow; what follows "Not:" is what agents reached for instead, which is the wrong answer for that need even where it has a purpose of its own.';
