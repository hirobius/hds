/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * layout-contract.mjs — pure logic behind scripts/check-layout-contract.mjs.
 *
 * The v1 layout contract (Adrian, 2026-10-07) as data: per component a
 * width (fill | hug), a fixed height of hug, whether it pads, and an optional
 * max width. `buildContract` derives the data file from the manifest list plus
 * the hand-set tables below; `evaluateMeasurement` turns one in-browser
 * measurement into exact violations. No browser or filesystem in here, so it
 * is unit-testable.
 */

export const CONTRACT_VERSION = 1;
export const KINDS = ['leaf', 'container', 'part', 'primitive', 'provider', 'overlay'];
export const RULES = [
  'width',
  'height-stretch',
  'outer-margin',
  'nested-padding',
  'form-max-width',
  'form-sibling-width',
  'overflow-390',
  'gap-off-scale',
];
/** Default max width of a form control in a form context (bug bash, 2026-10). */
export const FORM_MAX_WIDTH = '40rem';

// ── hand-set tables ──────────────────────────────────────────────────────────

/** Contract rule 2: these leaves FILL width. */
const LEAF_FILL = ['Input', 'Textarea', 'Select', 'Combobox', 'Table', 'Progress', 'Divider'];
/** Form controls that carry the form max width. */
const FORM_CONTROLS = ['Input', 'Textarea', 'Select', 'Combobox'];
/**
 * Containers, primitives and block-flow text FILL width in normal flow. Judgment
 * calls beyond the approved list (Text, Blockquote, CodeBlock, Slider, Field,
 * EmptyState, ...) are block content that flows to the parent's width; Stat is
 * deliberately NOT here: a readout should hug (audit 2026-10-07).
 */
const BLOCK_FILL = [
  'Alert',
  'Blockquote',
  'Box',
  'Pin',
  'StatusListItem',
  'Callout',
  'Card',
  'CodeBlock',
  'Container',
  'DataTableSection',
  'DestructiveSection',
  'Disclosure',
  'EmptyState',
  'Field',
  'Form',
  'FormActions',
  'FormField',
  'FormFieldShell',
  'Grid',
  'MetadataList',
  'MetricTiles',
  'Page',
  'PageHeader',
  'Sidebar',
  'Slider',
  'Stack',
  'StatusTile',
  'Surface',
  'Switcher',
  'Tabs',
  'TabsContent',
  'TabsList',
  'Text',
];
/** Rule 4: only these pad. */
const PADS = [
  'Alert',
  'AlertDialog',
  'Callout',
  'Card',
  'Dialog',
  'DialogContent',
  'Page',
  'Surface',
];
/** Compound parts: zero padding, the container's gap spaces them. */
const PARTS = [
  'CardBody',
  'CardDescription',
  'CardFooter',
  'CardHeader',
  'CardMetric',
  'CardProgress',
  'CardTitle',
  'DialogClose',
  'DialogDescription',
  'DialogFooter',
  'DialogHeader',
  'DialogContent',
  'DialogOverlay',
  'DialogPortal',
  'DialogTitle',
  'DialogTrigger',
  'FormField',
  'FormFieldShell',
  'MetricTile',
  'TabsContent',
  'TabsList',
  'TabsTrigger',
];
const PROVIDERS = [
  'HdsRouterProvider',
  'HdsThemeProvider',
  'ToastProvider',
  'Reveal',
  'VisuallyHidden',
];
const OVERLAYS = ['AlertDialog', 'Dialog', 'Menu', 'Popover', 'Tooltip'];
const PRIMITIVES = [
  'Stack',
  'Grid',
  'Page',
  'Surface',
  'Box',
  'Pin',
  'Container',
  'Sidebar',
  'Switcher',
];
const CONTAINERS = [
  'Alert',
  'AlertDialog',
  'Callout',
  'Card',
  'DataTableSection',
  'DestructiveSection',
  'Dialog',
  'Disclosure',
  'EmptyState',
  'Form',
  'MetricTiles',
  'Surface',
  'Page',
];

export function buildContract(names) {
  const components = {};
  for (const name of [...names].sort()) {
    const kind = PROVIDERS.includes(name)
      ? 'provider'
      : PARTS.includes(name)
        ? 'part'
        : OVERLAYS.includes(name)
          ? 'overlay'
          : PRIMITIVES.includes(name)
            ? 'primitive'
            : CONTAINERS.includes(name)
              ? 'container'
              : 'leaf';
    const entry = {
      width: LEAF_FILL.includes(name) || BLOCK_FILL.includes(name) ? 'fill' : 'hug',
      height: 'hug',
      pads: PADS.includes(name),
      kind,
      // Parts, providers and overlays are measured through their parent's story.
      probe: !(kind === 'part' || kind === 'provider' || kind === 'overlay'),
    };
    if (FORM_CONTROLS.includes(name)) entry.maxWidth = FORM_MAX_WIDTH;
    components[name] = entry;
  }
  return { version: CONTRACT_VERSION, components };
}

export function validateContract(contract) {
  const problems = [];
  if (contract?.version !== CONTRACT_VERSION) problems.push(`version must be ${CONTRACT_VERSION}`);
  const comps = contract?.components;
  if (!comps || typeof comps !== 'object') return [...problems, 'components must be an object'];
  for (const [name, e] of Object.entries(comps)) {
    if (!['fill', 'hug'].includes(e.width)) problems.push(`${name}: width must be fill|hug`);
    if (e.height !== 'hug') problems.push(`${name}: height must be hug (rule 3)`);
    if (typeof e.pads !== 'boolean') problems.push(`${name}: pads must be boolean`);
    if (typeof e.probe !== 'boolean') problems.push(`${name}: probe must be boolean`);
    if (!KINDS.includes(e.kind)) problems.push(`${name}: kind must be one of ${KINDS.join('|')}`);
    if (e.maxWidth !== undefined && !/^\d+(\.\d+)?(rem|px)$/.test(e.maxWidth)) {
      problems.push(`${name}: maxWidth must be a rem or px length`);
    }
  }
  return problems;
}

// ── evaluation ───────────────────────────────────────────────────────────────

const FILL_RATIO = 0.98;
const TOL = 1.5;

function toPx(len, remPx) {
  const n = parseFloat(len);
  return /rem$/.test(len) ? n * remPx : n;
}

/**
 * @param {object} entry   contract entry for the component
 * @param {object} m       measurement from the in-page probe (see check-layout-contract.mjs)
 * @param {{remPx?: number}} [opts]
 * @returns {{rule: string, detail: string, [k: string]: unknown}[]}
 */
export function evaluateMeasurement(entry, m, opts = {}) {
  const remPx = opts.remPx ?? 16;
  const out = [];
  const ratio = m.width / m.probeWidth;
  const measured = ratio >= FILL_RATIO ? 'fill' : 'hug';
  if (measured !== entry.width) {
    out.push({
      rule: 'width',
      detail: `declared ${entry.width}, measured ${measured} (${Math.round(m.width)}px of ${m.probeWidth}px, ratio ${ratio.toFixed(2)})`,
    });
  }
  if (m.height >= m.probeHeight - TOL && m.contentExtent < m.probeHeight - 8) {
    out.push({
      rule: 'height-stretch',
      detail: `height ${Math.round(m.height)}px equals the ${m.probeHeight}px parent while content is ${Math.round(m.contentExtent)}px`,
    });
  }
  for (const x of m.margins) {
    out.push({ rule: 'outer-margin', detail: `${x.el} has margin ${x.margin}`, el: x.el });
  }
  for (const x of m.nested) {
    out.push({
      rule: 'nested-padding',
      detail: `${x.inner} is padded directly inside padded ${x.outer}`,
      el: x.inner,
    });
  }
  for (const x of m.gaps) {
    out.push({ rule: 'gap-off-scale', detail: `${x.el} has gap ${x.gap}`, el: x.el });
  }
  if (entry.maxWidth && m.wideWidth > toPx(entry.maxWidth, remPx) + TOL) {
    out.push({
      rule: 'form-max-width',
      detail: `${Math.round(m.wideWidth)}px wide in a wide parent, max is ${entry.maxWidth}`,
    });
  }
  const sib = m.siblingControlWidths ?? [];
  if (sib.length > 1) {
    const ws = sib.map((s) => s.width);
    if (Math.max(...ws) - Math.min(...ws) > TOL) {
      out.push({
        rule: 'form-sibling-width',
        detail: `form controls differ in width: ${sib.map((s) => `${s.el}=${Math.round(s.width)}`).join(', ')}`,
      });
    }
  }
  if (m.overflow390 > 0) {
    out.push({
      rule: 'overflow-390',
      detail: `content overflows a 390px viewport by ${Math.round(m.overflow390)}px`,
    });
  }
  return out;
}

export function summarize(violations) {
  const counts = {};
  for (const v of violations) counts[v.rule] = (counts[v.rule] ?? 0) + 1;
  return counts;
}
