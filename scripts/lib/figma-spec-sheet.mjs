/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * figma-spec-sheet (hds spec-sheet coverage): builds one component's Figma spec
 * sheet from code, for any component in the manifest (generate-spec-sheets.mjs
 * only covers the `core` set, and its JSON is data, not a drawing).
 *
 *   specSheetModel(name, { manifest, tokens, source, deprecations })
 *     -> { name, title, lead, docsUrl, codePath, figmaNodeId, sections[] }
 *     Everything comes from code: public/hds-manifest.json componentSpecs
 *     (description, props, states, usage, a11y rules, docs page, @figma node;
 *     the props are the manifest's committed projection of component-api.json)
 *     and the component source (the token CSS variables and hds-type-* roles
 *     it uses), resolved against hirobius.tokens.json.
 *
 *   specSheetScript(entries) -> a use_figma script that draws each sheet on its
 *     page from the spec-sheet kit (Header, Section with its Content slot,
 *     TableHeaderRow/TableRow with Cell, Bullets, SourceFooter), copies the
 *     outer frame's spacing and fill bindings from the Button sheet, places
 *     the sheet right of the page's content, and runs hdsFitDocText
 *     (figma-doc-text-fit.mjs) so text hugs and nothing clips. Idempotent: a
 *     page that already holds "<Name> — spec sheet" is skipped. It writes no
 *     raw text node (all text lives in kit instances, which carry the kit's
 *     own, non-deprecated text styles) and deletes nothing that existed
 *     before the run; it only clears the placeholder children of the kit
 *     instances it has just created.
 */
import { hdsFitDocText } from './figma-doc-text-fit.mjs';

export const KIT = {
  header: '2290:914',
  section: '2290:908',
  footer: '2290:937',
  headerRow: '2290:831',
  row: '2290:842',
  cell: '2290:825',
  bullets: '2290:922',
  template: '2291:804', // Button — spec sheet: frame spacing + fill bindings
};
export const SHEET_SUFFIX = ' — spec sheet';
const MAX_BULLETS = 6;

function lookup(tree, parts) {
  let node = tree;
  for (const k of parts) {
    if (node == null || typeof node !== 'object' || !(k in node)) return undefined;
    node = node[k];
  }
  return node;
}

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** `--semantic-color-surface-sunken` -> `semantic.color.surface.sunken` (keys may be camelCase). */
export function tokenPathForCssVar(tree, cssVar) {
  const rest = cssVar.replace(/^--/, '');
  function walk(node, remaining, path) {
    if (remaining === '') return node && typeof node === 'object' && '$value' in node ? path : null;
    if (!node || typeof node !== 'object') return null;
    const keys = Object.keys(node)
      .filter((k) => !k.startsWith('$'))
      .sort((a, b) => kebab(b).length - kebab(a).length);
    for (const k of keys) {
      const kk = kebab(k);
      if (remaining === kk || remaining.startsWith(kk + '-')) {
        const hit = walk(node[k], remaining.slice(kk.length + 1), [...path, k]);
        if (hit) return hit;
      }
    }
    return null;
  }
  const hit = walk(tree, rest, []);
  return hit ? hit.join('.') : null;
}

const REF = /^\{([^}]+)\}$/;
function resolve(tree, raw, depth = 0) {
  if (depth > 20) return String(raw);
  if (typeof raw === 'string' && REF.test(raw)) {
    const node = lookup(tree, raw.match(REF)[1].split('.'));
    return node && '$value' in node ? resolve(tree, node.$value, depth + 1) : raw;
  }
  if (raw && typeof raw === 'object' && 'value' in raw && 'unit' in raw)
    return `${raw.value}${raw.unit}`;
  if (Array.isArray(raw)) return raw.join(', ');
  return raw;
}

/** A one-line value for a token: Light/Dark for moded colours, size / line height for type roles. */
export function tokenValue(tree, dotted) {
  const node = lookup(tree, dotted.split('.'));
  if (!node || !('$value' in node)) return null;
  const modes = node.$extensions?.['com.figma.variables']?.modes;
  if (modes && typeof modes === 'object' && Object.keys(modes).length > 1) {
    return Object.entries(modes)
      .map(([m, v]) => `${m} ${resolve(tree, v)}`)
      .join(' · ');
  }
  const v = node.$value;
  if (v && typeof v === 'object' && !('unit' in v)) {
    const parts = ['fontSize', 'lineHeight', 'fontWeight']
      .filter((k) => k in v)
      .map((k) => resolve(tree, v[k]));
    if (parts.length) return parts.join(' / ');
  }
  return String(resolve(tree, v));
}

/** Token paths a component source uses: CSS custom properties and hds-type-* roles. */
export function tokensInSource(tree, source) {
  const found = new Set();
  for (const m of source.matchAll(/var\((--[a-z0-9-]+)/g)) {
    const p = tokenPathForCssVar(tree, m[1]);
    if (p) found.add(p);
  }
  for (const m of source.matchAll(/\bhds-type-([a-z]+(?:-[a-z]+)*)\b/g)) {
    const p = tokenPathForCssVar(tree, `--semantic-typography-${m[1]}`);
    if (p) found.add(p);
  }
  return [...found].sort();
}

function propRow(name, p) {
  const values = p.values ? p.values.join(' | ') : p.type === 'boolean' ? 'true | false' : '—';
  const type = p.type === 'enum' ? 'enum' : p.type;
  const dflt = p.default !== undefined ? String(p.default) : p.optional ? '—' : 'required';
  return [name, type, values, dflt];
}

function bulletsFromUsage(usage) {
  if (!usage) return [];
  const out = [];
  if (usage.when) out.push(`Use it to: ${usage.when}`);
  if (usage.whenNot) out.push(`Not for: ${usage.whenNot}`);
  for (const u of usage.useInstead ?? []) out.push(`Use ${u.component} instead for ${u.reason}.`);
  for (const r of usage.rules ?? []) out.push(typeof r === 'string' ? r : r.rule);
  return out.filter(Boolean);
}

function clampBullets(items, docsUrl) {
  if (items.length <= MAX_BULLETS) return items;
  return [
    ...items.slice(0, MAX_BULLETS - 1),
    `${items.length - (MAX_BULLETS - 1)} more on ${docsUrl}.`,
  ];
}

export function figmaNodeIdFromUrl(url) {
  const m = /node-id=(\d+)-(\d+)/.exec(url ?? '');
  return m ? `${m[1]}:${m[2]}` : null;
}

export function specSheetModel(
  name,
  { manifest, tokens, source = '', deprecations = { tokens: [] } },
) {
  const spec = manifest.componentSpecs?.[name];
  if (!spec)
    throw new Error(`figma-spec-sheet: ${name} is not in public/hds-manifest.json componentSpecs`);
  const site = String(manifest.docs ?? '')
    .replace(/\/$/, '')
    .replace(/^https?:\/\//, '');
  const docsUrl = spec.docsPage ? `${site}${spec.docsPage}` : site;
  const deprecated = new Map((deprecations.tokens ?? []).map((d) => [d.path, d.replacement]));
  const sections = [];

  const usage = bulletsFromUsage(spec.usage);
  if (spec.deprecated) usage.unshift(`Deprecated: ${spec.deprecated}`);
  sections.push({
    title: 'Usage',
    intro: usage.length
      ? 'When to use it, from the manifest usage block.'
      : 'No usage block in the manifest yet; the description stands in.',
    bullets: clampBullets(usage.length ? usage : [spec.description || name], docsUrl),
  });

  sections.push({
    title: 'Preview',
    intro: 'The library component, default variant.',
    preview: true,
  });

  const props = Object.entries(spec.props ?? {});
  if (props.length) {
    sections.push({
      title: 'Props',
      intro: `${name}Props from ${spec.filePath} (manifest projection of component-api.json).`,
      columns: ['Prop', 'Type', 'Values', 'Default'],
      mono: [0, 2],
      rows: props.map(([n, p]) => propRow(n, p)),
    });
  }

  const axes = props.filter(([, p]) => p.type === 'enum' || p.type === 'boolean');
  if (axes.length || spec.states?.length) {
    const rows = axes.map(([n, p]) => [n, p.values ? p.values.join(', ') : 'true, false']);
    if (spec.states?.length) rows.push(['state', spec.states.join(', ')]);
    sections.push({
      title: 'Variants, sizes and states',
      intro:
        'Every axis code accepts: enum and boolean props, plus the states the component paints.',
      columns: ['Axis', 'Values'],
      mono: [0],
      rows,
    });
  }

  const paths = new Set(tokensInSource(tokens, source));
  for (const role of Object.values(spec.tokens ?? {})) {
    const p = typeof role === 'string' && lookup(tokens, role.split('.')) ? role : null;
    if (p) paths.add(p);
  }
  const tokenRows = [...paths]
    .sort()
    .map((p) => [
      p,
      deprecated.has(p) ? `deprecated, use ${deprecated.get(p)}` : (tokenValue(tokens, p) ?? '—'),
    ]);
  if (tokenRows.length) {
    sections.push({
      title: 'Tokens used',
      intro: `The token variables and type roles ${spec.filePath} reads.`,
      columns: ['Token', 'Value'],
      mono: [0, 1],
      rows: tokenRows,
    });
  }

  const a11y = (spec.a11yRules ?? [])
    .map((r) => (typeof r === 'string' ? r : r.rule))
    .filter(Boolean);
  if (a11y.length) {
    sections.push({
      title: 'Accessibility',
      intro: 'Rules the component enforces or asks of you.',
      bullets: clampBullets(a11y, docsUrl),
    });
  }

  return {
    name,
    title: name,
    lead: spec.description || name,
    docsUrl,
    codePath: spec.filePath,
    dataPath: 'public/hds-manifest.json',
    figmaNodeId: figmaNodeIdFromUrl(spec.figmaUrl ?? spec.figmaLink),
    sections,
  };
}

/** The in-Figma builder. Kept as a plain function so its source can be embedded in the script. */
async function hdsBuildSpecSheets(entries, KIT, SHEET_SUFFIX, fit) {
  const get = (id) => figma.getNodeByIdAsync(id);
  const kit = {};
  for (const [k, id] of Object.entries(KIT)) kit[k] = await get(id);
  const fonts = new Map();
  for (const k of ['header', 'section', 'footer', 'cell', 'bullets']) {
    for (const t of kit[k].findAllWithCriteria({ types: ['TEXT'] })) {
      if (!t.characters.length) continue;
      for (const f of t.getRangeAllFontNames(0, t.characters.length))
        fonts.set(f.family + '|' + f.style, f);
    }
  }
  await Promise.all([...fonts.values()].map((f) => figma.loadFontAsync(f)));
  const cellVariant = (style) =>
    kit.cell.children.find((c) => c.name === `Style=${style}`) ?? kit.cell.defaultVariant;
  const slotOf = (inst) => inst.findOne((n) => n.type === 'SLOT');
  const clearSlot = (slot) => {
    for (const c of [...slot.children]) c.remove();
  };
  const setProps = (inst, values) => {
    const defs = inst.componentProperties;
    const out = {};
    for (const [label, v] of Object.entries(values)) {
      const key = Object.keys(defs).find((k) => k.split('#')[0] === label);
      if (key) out[key] = v;
    }
    inst.setProperties(out);
  };
  const results = [];
  for (const e of entries) {
    const m = e.model;
    const page = await get(e.pageId);
    await page.loadAsync();
    const name = m.name + SHEET_SUFFIX;
    const existing = page.children.find((n) => n.name === name);
    if (existing) {
      results.push({ page: page.name, skipped: existing.id });
      continue;
    }
    const tpl = kit.template;
    const sheet = figma.createAutoLayout('VERTICAL', { name });
    page.appendChild(sheet);
    sheet.resize(tpl.width, 100);
    sheet.primaryAxisSizingMode = 'AUTO';
    sheet.counterAxisSizingMode = 'FIXED';
    sheet.fills = tpl.fills;
    sheet.clipsContent = false;
    for (const key of [
      'itemSpacing',
      'paddingTop',
      'paddingBottom',
      'paddingLeft',
      'paddingRight',
    ]) {
      sheet[key] = tpl[key];
      const b = tpl.boundVariables?.[key];
      if (b) {
        const v = await figma.variables.getVariableByIdAsync(b.id);
        if (v) sheet.setBoundVariable(key, v);
      }
    }
    const right = Math.max(
      0,
      ...page.children.filter((n) => n !== sheet).map((n) => n.x + n.width),
    );
    sheet.x = right + 160;
    sheet.y = 0;
    const header = kit.header.createInstance();
    sheet.appendChild(header);
    header.layoutSizingHorizontal = 'FILL';
    setProps(header, { Title: m.title, Lead: m.lead, 'Show link': true, 'Docs link': 'View docs' });
    let previewed = null;
    for (const s of m.sections) {
      const sec = kit.section.createInstance();
      sheet.appendChild(sec);
      sec.layoutSizingHorizontal = 'FILL';
      setProps(sec, { Title: s.title, Intro: s.intro, 'Show intro': Boolean(s.intro) });
      sec.name = s.title;
      const slot = slotOf(sec);
      clearSlot(slot);
      if (s.preview) {
        const node = m.figmaNodeId ? await get(m.figmaNodeId) : null;
        const main =
          node?.type === 'COMPONENT_SET'
            ? node.defaultVariant
            : node?.type === 'COMPONENT'
              ? node
              : null;
        // A node named _<Name> is archived or deprecated in the library: never preview it.
        if (main && !/^_/.test(node.name)) {
          const inst = main.createInstance();
          slot.appendChild(inst);
          previewed = main.id;
        } else {
          sec.visible = false;
        }
      } else if (s.bullets) {
        const b = kit.bullets.createInstance();
        slot.appendChild(b);
        b.layoutSizingHorizontal = 'FILL';
        const vals = {};
        for (let i = 1; i <= 6; i++) {
          vals[`Show item ${i}`] = i <= s.bullets.length;
          if (i <= s.bullets.length) vals[`Item ${i}`] = s.bullets[i - 1];
        }
        setProps(b, vals);
      } else if (s.rows) {
        const table = figma.createAutoLayout('VERTICAL', {
          name: `${s.title} table`,
          itemSpacing: 0,
        });
        table.fills = [];
        slot.appendChild(table);
        table.layoutSizingHorizontal = 'FILL';
        const addRow = (comp, cells, header) => {
          const row = comp.createInstance();
          table.appendChild(row);
          row.layoutSizingHorizontal = 'FILL';
          const cs = slotOf(row);
          clearSlot(cs);
          cells.forEach((text, i) => {
            const style = header ? 'Header' : (s.mono ?? []).includes(i) ? 'Mono' : 'Body';
            const c = cellVariant(style).createInstance();
            cs.appendChild(c);
            c.layoutSizingHorizontal = 'FILL';
            setProps(c, { Text: String(text) });
          });
        };
        addRow(kit.headerRow, s.columns, true);
        for (const r of s.rows) addRow(kit.row, r, false);
      }
    }
    const footer = kit.footer.createInstance();
    sheet.appendChild(footer);
    setProps(footer, {
      Code: m.codePath,
      'Show Code': true,
      Data: m.dataPath,
      'Show Data': true,
      Docs: m.docsUrl,
      'Show Docs': true,
      'Figma component': m.name,
      'Show Set': Boolean(previewed),
      'Non-visual': !previewed,
    });
    const fitted = fit(sheet, { slots: true });
    results.push({
      page: page.name,
      sheet: sheet.id,
      sections: m.sections.length,
      preview: previewed,
      fitted: fitted.length,
      w: Math.round(sheet.width),
      h: Math.round(sheet.height),
    });
  }
  return results;
}

export function specSheetScript(entries) {
  return `${hdsFitDocText.toString()}
${hdsBuildSpecSheets.toString()}
return await hdsBuildSpecSheets(${JSON.stringify(entries)}, ${JSON.stringify(KIT)}, ${JSON.stringify(SHEET_SUFFIX)}, hdsFitDocText);
`;
}
