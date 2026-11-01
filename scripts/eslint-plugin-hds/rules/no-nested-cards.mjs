/**
 * hds/no-nested-cards
 *
 * No cards within cards, ever (hds#1046, Adrian 2026-11-01). Errors when a
 * card (`Card`) or section surface (`Surface`, `Callout`) is rendered inside
 * another card or section surface, including the common "section surface
 * wrapping a card list" (`<Surface><h2/>{items.map(i => <Card/>)}</Surface>`).
 * Groupings are declared by type hierarchy (section title, count, metadata)
 * on a plain region, never by a container surface; a list that needs
 * separation uses spacing or dividers.
 *
 * Compound parts (`Card.Header`, `Card.Row`, …) are not cards. HDS names are
 * resolved through imports from `@hirobius/design-system` (aliases included);
 * unimported names count as HDS's own. Consumer wrappers that draw a card or a
 * surface join through the `cards` / `surfaces` options.
 */
const HDS_SOURCE = /^@hirobius\/design-system(\/|$)/;
const DEFAULT_CARDS = ['Card'];
const DEFAULT_SURFACES = ['Surface', 'Callout'];

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow a Card or section surface inside another Card or section surface; group with type hierarchy instead.',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-nested-cards',
    },
    schema: [
      {
        type: 'object',
        properties: {
          cards: { type: 'array', items: { type: 'string' } },
          surfaces: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      nested:
        '<{{inner}}> inside <{{outer}}>: no cards within cards. Drop the outer surface and declare the group with type hierarchy (a section title, a count, metadata) on a plain region; separate list items with spacing or dividers.',
    },
  },
  create(context) {
    const opts = context.options[0] || {};
    const hdsNames = new Set([...DEFAULT_CARDS, ...DEFAULT_SURFACES]);
    // local name -> true when it is a card/surface
    const surfaces = new Map();
    for (const n of hdsNames) surfaces.set(n, true);
    for (const n of opts.cards || []) surfaces.set(n, true);
    for (const n of opts.surfaces || []) surfaces.set(n, true);

    return {
      ImportDeclaration(node) {
        const fromHds = HDS_SOURCE.test(String(node.source.value));
        for (const spec of node.specifiers) {
          if (spec.type !== 'ImportSpecifier') continue;
          const imported = spec.imported.name ?? spec.imported.value;
          const local = spec.local.name;
          const isSurface = fromHds && hdsNames.has(imported);
          // An import of a default name from elsewhere shadows the default.
          if (isSurface) surfaces.set(local, true);
          else if (
            surfaces.has(local) &&
            !(opts.cards || []).concat(opts.surfaces || []).includes(local)
          )
            surfaces.delete(local);
        }
      },
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || !surfaces.has(node.name.name)) return;
        for (let p = node.parent.parent; p; p = p.parent) {
          if (
            p.type === 'JSXElement' &&
            p.openingElement.name.type === 'JSXIdentifier' &&
            surfaces.has(p.openingElement.name.name)
          ) {
            context.report({
              node,
              messageId: 'nested',
              data: { inner: node.name.name, outer: p.openingElement.name.name },
            });
            return;
          }
        }
      },
    };
  },
};
