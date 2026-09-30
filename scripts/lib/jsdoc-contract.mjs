/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * jsdoc-contract.mjs — pure parser for the component contract tags.
 *
 * Tags (documented in docs/rules/REACT_COMPONENTS.md):
 *   @usage <sentence>                  when to use the component
 *   @whenNot <sentence>                when not to
 *   @useInstead <Component> [reason]   repeatable
 *   @slot <name> <description>         repeatable
 *   @keyboard <keys> <effect>          repeatable; <keys> is one token
 *   @ai-rules <text>                   agent-facing authoring rules
 *
 * A tag body runs until the next `@tag` at the start of a line, a blank line
 * (paragraph break), or the end of the block. No I/O here: callers hand in the JSDoc block text.
 */

function clean(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a JSDoc block into its prose and an ordered list of tags. */
function splitBlock(block) {
  const lines = String(block ?? '')
    .replace(/^\s*\/\*\*?/, '')
    .replace(/\*\/\s*$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*(?!\/)\s?/, '').trim());

  const prose = [];
  const tags = [];
  let current = null;

  for (const line of lines) {
    const start = line.match(/^@([A-Za-z][\w-]*)\b:?\s*(.*)$/);
    if (start) {
      current = { name: start[1], body: [start[2]] };
      tags.push(current);
    } else if (!line) {
      // A blank line is a paragraph break: it closes the open tag body, so a
      // prose paragraph written after a tag stays description.
      current = null;
    } else if (current) {
      current.body.push(line);
    } else {
      prose.push(line);
    }
  }

  return {
    prose: clean(prose.join(' ')),
    tags: tags.map((tag) => ({ name: tag.name, body: clean(tag.body.join(' ')) })),
  };
}

/**
 * The prose of a JSDoc block with every block tag, and every continuation
 * line of a tag, removed.
 *
 * @param {string} block
 * @returns {string}
 */
export function stripJsdocTags(block) {
  return splitBlock(block).prose;
}

/**
 * @param {string} block a JSDoc block, or ''
 * @returns {{
 *   usage: { when: string|null, whenNot: string|null, useInstead: Array<{component: string, reason: string|null}> },
 *   slots: Array<{name: string, description: string}>,
 *   keyboard: Array<{keys: string, effect: string}>,
 *   aiRules: string|null,
 * }}
 */
export function parseJsdocContract(block) {
  const out = {
    usage: { when: null, whenNot: null, useInstead: [] },
    slots: [],
    keyboard: [],
    aiRules: null,
  };

  for (const { name, body } of splitBlock(block).tags) {
    if (!body) continue;
    const [head, ...rest] = body.split(' ');
    const tail = rest.join(' ');

    if (name === 'usage') out.usage.when = body;
    else if (name === 'whenNot') out.usage.whenNot = body;
    else if (name === 'useInstead') {
      out.usage.useInstead.push({ component: head, reason: tail || null });
    } else if (name === 'slot') {
      out.slots.push({ name: head, description: tail });
    } else if (name === 'keyboard') {
      out.keyboard.push({ keys: head, effect: tail });
    } else if (name === 'ai-rules') out.aiRules = body;
  }

  return out;
}

/**
 * The parsed contract with every empty field (and null) dropped, ready to spread onto a
 * generated spec: `{ ...compactContract(c) }` adds nothing for an untagged
 * component.
 *
 * @param {ReturnType<typeof parseJsdocContract>} contract
 */
export function compactContract(contract) {
  const out = {};
  const { when, whenNot, useInstead } = contract.usage;
  const usage = {};
  if (when) usage.when = when;
  if (whenNot) usage.whenNot = whenNot;
  if (useInstead.length) {
    usage.useInstead = useInstead.map(({ component, reason }) =>
      reason ? { component, reason } : { component },
    );
  }
  if (Object.keys(usage).length) out.usage = usage;
  if (contract.slots.length) out.slots = contract.slots;
  if (contract.keyboard.length) out.keyboard = contract.keyboard;
  if (contract.aiRules) out.aiRules = contract.aiRules;
  return out;
}

/**
 * Merge `@slot` tags into a spec's hand-kept `slots`. A hand-kept slot (one
 * without `source: 'jsdoc'`) is never overwritten, even by a tag of the same
 * name. Slots this function added on an earlier run are rebuilt from the tags,
 * so removing a tag removes its slot on the next regen.
 *
 * @param {Array<object>|undefined} existing the spec's current `slots`
 * @param {Array<{name: string, description: string}>} tagged
 * @returns {Array<object>|undefined} undefined when there is nothing to keep
 */
export function mergeSlots(existing, tagged) {
  const kept = (existing ?? []).filter((slot) => slot?.source !== 'jsdoc');
  const names = new Set(kept.map((slot) => slot?.name));
  const added = tagged
    .filter((slot) => !names.has(slot.name))
    .map((slot) => ({ name: slot.name, description: slot.description, source: 'jsdoc' }));
  const merged = [...kept, ...added];
  return existing === undefined && merged.length === 0 ? undefined : merged;
}
