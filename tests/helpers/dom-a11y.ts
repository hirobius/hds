/**
 * The DOM and accessibility outline of a rendered tree (hds#468), as the lines
 * docs/baselines/dom-a11y.json records per demo.
 *
 * `dom`: one line per element, indented by depth: the tag, then role, the aria
 * states and the data-* attributes, sorted. Classes, ids, inline styles and
 * the attributes that point at an id (aria-controls, for, ...) are left out:
 * they churn with useId and styling, and a consumer may not select on them.
 * So are data-radix-* (Radix internals) and data-testid.
 *
 * An <svg>'s shapes are left out too: drawing is the visual baseline's job.
 *
 * `reader`: what @guidepup/virtual-screen-reader speaks at each element it
 * stops on walking the tree from start to end: role, accessible name and
 * states. Text stops and "end of" stops are left out, so demo copy outside an
 * accessible name does not churn the baseline.
 */
import { virtual } from '@guidepup/virtual-screen-reader';

/** Attributes whose value is an element id, or ids: they change with useId. */
const ID_REFS = new Set([
  'aria-activedescendant',
  'aria-controls',
  'aria-describedby',
  'aria-details',
  'aria-errormessage',
  'aria-flowto',
  'aria-labelledby',
  'aria-owns',
  'for',
]);

/** True for an attribute the outline records. */
const recorded = (name: string) =>
  name === 'role' ||
  (name.startsWith('aria-') && !ID_REFS.has(name)) ||
  (name.startsWith('data-') && name !== 'data-testid' && !name.startsWith('data-radix-'));

const quote = (value: string) => JSON.stringify(value.replace(/\s+/g, ' ').trim());

function elementLine(el: Element, depth: number): string {
  const attrs = [...el.attributes]
    .filter((attr) => recorded(attr.name))
    .map((attr) => (attr.value === '' ? attr.name : `${attr.name}=${quote(attr.value)}`))
    .sort();
  return `${'  '.repeat(depth)}${el.tagName.toLowerCase()}${attrs.length ? ` ${attrs.join(' ')}` : ''}`;
}

/** The element lines under `root`, depth first; `root` itself is not one. */
export function domLines(root: Element): string[] {
  const lines: string[] = [];
  const walk = (el: Element, depth: number) => {
    for (const child of el.children) {
      if (child.tagName === 'STYLE' || child.tagName === 'SCRIPT') continue;
      lines.push(elementLine(child, depth));
      if (child.tagName.toLowerCase() !== 'svg') walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return lines;
}

/**
 * What the virtual screen reader speaks at each element under `container`,
 * start to end. Started on a container other than document.body, the reader
 * wraps from the last stop back to the first rather than saying "end of
 * document", so the walk ends when it is back at its first stop.
 */
async function readerLines(container: Element, maxStops = 5000): Promise<string[]> {
  const lines: string[] = [];
  await virtual.start({ container });
  try {
    const first = { node: virtual.activeNode, phrase: await virtual.lastSpokenPhrase() };
    for (let i = 0; i < maxStops; i++) {
      const phrase = await virtual.lastSpokenPhrase();
      if (i > 0 && virtual.activeNode === first.node && phrase === first.phrase) return lines;
      const text = phrase.replace(/\s+/g, ' ').trim();
      if (virtual.activeNode?.nodeType === 1 && text && !text.startsWith('end of ')) {
        lines.push(text);
      }
      await virtual.next();
    }
    throw new Error(`the screen reader made ${maxStops} stops without coming back to the first`);
  } finally {
    await virtual.stop();
  }
}

export interface DomA11yOutline {
  dom: string[];
  reader: string[];
}

export async function outline(container: Element): Promise<DomA11yOutline> {
  return { dom: domLines(container), reader: await readerLines(container) };
}
