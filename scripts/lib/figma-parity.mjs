/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Figma <-> code parity (scripts/check-figma-parity.mjs).
 *
 * `parity({ read, code, variables })` compares one full read of the Figma library
 * (figma/parity/read.json: every component, its properties and what it nests, and
 * one hash per variable collection) with the code records, and returns findings
 * plus a score. It is a pure function: the CLI loads the files, tests pass objects.
 *
 * What is compared, and the finding each difference becomes:
 *
 *   components   a library component in code with no Figma component  missing-in-figma
 *                a Figma component with no code component              missing-in-code
 *                a Figma component code has but does not link          unlinked
 *                a Figma-only part with no recorded pairing            part-not-recorded
 *                an icon one side has and the other does not           icon-missing-in-figma,
 *                                                                      icon-missing-in-code
 *                an @figma tag on a variant, a page or a retired node  tag-not-on-component
 *                different names on the two sides                      name-mismatch
 *   variants     a Figma option code does not accept                   option-not-in-code
 *                a code value Figma does not draw                      option-not-in-figma
 *                the same option in another letter case                option-case
 *                different defaults                                    default-mismatch
 *                a code variant axis with no Figma property            axis-not-in-figma
 *   properties   a Figma property with no prop and no recorded reason  property-not-in-code
 *                a property name outside the naming contract           property-name
 *   nesting      Figma nests a component the code does not use         nesting-mismatch
 *   variables    the library differs from figma/snapshot.json          variables-changed
 *                the tokens differ from figma/snapshot.json            token-missing-in-figma,
 *                                                                      token-extra-in-figma,
 *                                                                      token-value-mismatch
 *                a variable collection no token builds                 collection-not-in-code
 *   read         the read is older than the allowed age                read-stale
 *
 * A difference that figma/code-connect.json already records with a reason
 * (`figmaOnly`, `codeOnly`, `values`, `set`) is not a finding: that registry is
 * the place a deliberate difference is written down, and check-code-connect holds
 * it to the same read.
 *
 * Score: every comparison is one check. score = passed / total, per area and
 * overall, so one number moves when one thing is fixed.
 */

export const SEVERITIES = ['high', 'medium', 'low'];

/** Who fixes a finding kind: the code records, or the Figma library. */
const KINDS = {
  'missing-in-figma': { severity: 'high', area: 'components', fix: 'figma' },
  'missing-in-code': { severity: 'high', area: 'components', fix: 'figma' },
  unlinked: { severity: 'medium', area: 'components', fix: 'code' },
  'duplicate-link': { severity: 'medium', area: 'components', fix: 'code' },
  'part-not-recorded': { severity: 'medium', area: 'components', fix: 'code' },
  'icon-missing-in-figma': { severity: 'low', area: 'components', fix: 'figma' },
  'icon-missing-in-code': { severity: 'medium', area: 'components', fix: 'figma' },
  'tag-not-on-component': { severity: 'medium', area: 'components', fix: 'code' },
  'name-mismatch': { severity: 'medium', area: 'components', fix: 'figma' },
  'option-not-in-code': { severity: 'high', area: 'variants', fix: 'figma' },
  'option-not-in-figma': { severity: 'medium', area: 'variants', fix: 'figma' },
  'option-case': { severity: 'low', area: 'variants', fix: 'figma' },
  'default-mismatch': { severity: 'low', area: 'variants', fix: 'figma' },
  'axis-not-in-figma': { severity: 'medium', area: 'variants', fix: 'figma' },
  'property-not-in-code': { severity: 'medium', area: 'properties', fix: 'figma' },
  'property-name': { severity: 'low', area: 'properties', fix: 'figma' },
  'nesting-mismatch': { severity: 'low', area: 'nesting', fix: 'figma' },
  'variables-changed': { severity: 'high', area: 'variables', fix: 'code' },
  'token-missing-in-figma': { severity: 'high', area: 'variables', fix: 'figma' },
  'token-extra-in-figma': { severity: 'medium', area: 'variables', fix: 'figma' },
  'token-value-mismatch': { severity: 'high', area: 'variables', fix: 'figma' },
  'collection-not-in-code': { severity: 'medium', area: 'variables', fix: 'figma' },
  'read-stale': { severity: 'medium', area: 'read', fix: 'code' },
};

export const AREAS = ['components', 'variants', 'properties', 'nesting', 'variables'];
export const CONTRACT_AXES = ['variant', 'tone', 'size', 'density'];

/** Pages whose components are not the live library. */
const RELEASE_STAMP = 'Hirobius/Meta';
const RETIRED_PAGE = /^(Archive|Deprecated)/;
const TOOLING_PAGE = /^Spec sheet kit$/;
const ICON_PAGE = /^Icon$/;

/** A short stable hash of a list, so a grouped finding gets a new id when its members change. */
const setKey = (names) => {
  let h = 2166136261;
  for (const ch of [...names].sort().join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return `${names.length}-${h.toString(16).padStart(8, '0')}`;
};

const camel = (name) =>
  name
    .replace(/[^A-Za-z0-9]+(.)?/g, (_m, c) => (c ? c.toUpperCase() : ''))
    .replace(/^./, (c) => c.toLowerCase());

/** `Size`, `Show icon`, `Text style`: Title Case first word, then lower case words. */
export function propertyNameProblem(name) {
  if (/[a-z][A-Z]/.test(name)) return 'two words written as one';
  if (/\d$/.test(name)) return 'ends with a digit';
  if (!/^[A-Z]/.test(name)) return 'does not start with a capital';
  if (/ [A-Z]/.test(name)) return 'a later word starts with a capital';
  return null;
}

/** figma/parity/read.json -> the lists the comparison walks. */
export function indexRead(read) {
  const live = [];
  const retired = [];
  const icons = [];
  const emptyPages = [];
  for (const page of read.pages) {
    const rows = page.components.map((c) => ({ ...c, page: page.name }));
    if (RETIRED_PAGE.test(page.name)) retired.push(...rows);
    else if (ICON_PAGE.test(page.name)) icons.push(...rows);
    else if (TOOLING_PAGE.test(page.name)) continue;
    else {
      const drawn = rows.filter((c) => !c.name.startsWith('_'));
      live.push(...drawn);
      if (drawn.length === 0) emptyPages.push(page.name);
    }
  }
  return { live, retired, icons, emptyPages, byId: new Map(live.map((c) => [c.id, c])) };
}

/**
 * @param {object} input
 * @param {object} input.read       figma/parity/read.json
 * @param {object} input.code       { components: [{ name, class, deprecated, filePath, nodeId, props, consumers }], templates }
 * @param {object} input.variables  { snapshotDigest, drift: { missing, extra, changed }, unmanaged: string[] }
 * @param {object} [input.baseline] { accepted: { [findingId]: { reason } } }
 * @param {string} [input.today]    ISO date, for the age of the read
 * @param {number} [input.maxAgeDays]
 */
export function parity({ read, code, variables, baseline = {}, today, maxAgeDays = 14 }) {
  const findings = [];
  const checks = Object.fromEntries(AREAS.map((area) => [area, { total: 0, failed: 0 }]));
  const add = (kind, subject, detail, extra = {}) => {
    const meta = KINDS[kind];
    const id = `${kind}:${subject}${extra.key ? `:${extra.key}` : ''}`;
    findings.push({
      id,
      kind,
      subject,
      detail,
      ...meta,
      ...(extra.fixHint && { fixHint: extra.fixHint }),
    });
    if (checks[meta.area]) checks[meta.area].failed += 1;
  };
  const check = (area) => (checks[area].total += 1);

  const figma = indexRead(read);
  const templates = code.templates ?? {};
  const byName = new Map(code.components.map((c) => [c.name, c]));
  const overrides = new Map((code.overrides ?? []).map((o) => [o.nodeId, o]));
  const linked = new Map();
  const linkedNames = new Set();
  const link = (nodeId, component) => {
    const other = linked.get(nodeId);
    if (other && other.name !== component.name) {
      add(
        'duplicate-link',
        component.name,
        `${component.name} and ${other.name} both link Figma node ${nodeId}. Only one is compared.`,
      );
      return;
    }
    linked.set(nodeId, component);
    linkedNames.add(component.name);
  };

  // ── components: code -> Figma ────────────────────────────────────────────
  for (const component of code.components) {
    if (component.class !== 'library') continue;
    check('components');
    if (!component.nodeId) {
      if (!component.deprecated) {
        add(
          'missing-in-figma',
          component.name,
          'A library component in code has no Figma component.',
        );
      }
      continue;
    }
    const node = figma.byId.get(component.nodeId);
    if (node) {
      link(node.id, component);
      if (node.name !== component.name) {
        add(
          'name-mismatch',
          component.name,
          `Code names it ${component.name}; Figma names node ${node.id} "${node.name}".`,
        );
      }
      continue;
    }
    if (component.deprecated && figma.retired.some((c) => c.id === component.nodeId)) continue;
    // A family drawn as a page of components (Icon) is linked to its page.
    if (read.pages.some((page) => page.id === component.nodeId && page.components.length)) continue;
    const sameName = figma.live.find((c) => c.name === component.name);
    add(
      'tag-not-on-component',
      component.name,
      sameName
        ? `Its @figma tag names ${component.nodeId}, which is not a component or component set. The Figma component ${component.name} is ${sameName.id}.`
        : `Its @figma tag names ${component.nodeId}, which is not a live component in the library.`,
      sameName && { fixHint: `Point the @figma tag of ${component.name} at ${sameName.id}.` },
    );
    if (sameName) link(sameName.id, component);
  }

  // ── components: Figma -> code ────────────────────────────────────────────
  const nestedBy = new Map();
  for (const node of figma.live) {
    for (const name of node.nests ?? []) {
      nestedBy.set(name, [...(nestedBy.get(name) ?? []), node.name]);
    }
  }
  for (const node of figma.live) {
    check('components');
    if (linked.has(node.id)) continue;
    // figma/mapping-overrides.json: a pairing recorded with a reason (a compound part such
    // as Menu.Item, or a part code renders inline). A part that is a code export is compared.
    const override = overrides.get(node.id);
    if (override) {
      const target = byName.get(override.mapsTo);
      if (target && !linkedNames.has(target.name)) link(node.id, target);
      continue;
    }
    const codeName = node.name.replace(/\//g, '');
    if (byName.has(node.name) || byName.has(codeName)) {
      const name = byName.has(node.name) ? node.name : codeName;
      add(
        'unlinked',
        name,
        `Figma draws ${node.name} (${node.id}) and code has ${name}, but no @figma tag links them.`,
        {
          fixHint: `Add an @figma tag for ${node.id} to ${name}.`,
        },
      );
      link(node.id, byName.get(name));
      continue;
    }
    if (templates[node.name] || templates[codeName]) continue;
    if (nestedBy.has(node.name)) {
      add(
        'part-not-recorded',
        node.name,
        `Figma has the part ${node.name} (${node.id}), used by ${nestedBy.get(node.name).join(', ')}. Code has no export with this name and no pairing is recorded.`,
        {
          fixHint: `Record what ${node.name} is in code in figma/mapping-overrides.json, with the reason.`,
        },
      );
      continue;
    }
    add(
      'missing-in-code',
      node.name,
      `Figma has ${node.name} (${node.id}). Code has no export with this name.`,
    );
  }

  // ── icons ────────────────────────────────────────────────────────────────
  if (code.icons) {
    const kebab = (name) =>
      name
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Za-z])(\d)/g, '$1-$2')
        .toLowerCase();
    const inFigma = new Set(figma.icons.map((icon) => icon.name.replace(/^Icon\//, '')));
    const inCode = new Set(code.icons.map(kebab));
    checks.components.total += new Set([...inFigma, ...inCode]).size;
    const onlyCode = [...inCode].filter((name) => !inFigma.has(name));
    const onlyFigma = [...inFigma].filter((name) => !inCode.has(name));
    const group = (kind, names, detail) => {
      if (names.length === 0) return;
      add(kind, 'Icon', `${detail}: ${names.join(', ')}.`, { key: setKey(names) });
      checks.components.failed += names.length - 1;
    };
    group(
      'icon-missing-in-figma',
      onlyCode,
      `${onlyCode.length} icon(s) of the code icon set are not drawn in Figma`,
    );
    group(
      'icon-missing-in-code',
      onlyFigma,
      `${onlyFigma.length} Figma icon(s) are not in the code icon set`,
    );
  }

  // ── variants and properties ──────────────────────────────────────────────
  for (const [nodeId, component] of linked) {
    const node = figma.byId.get(nodeId);
    const template = templates[component.name]?.properties ?? null;
    const props = component.props ?? {};
    const mappedProps = new Set();
    // "A string prop or children is a text property": one TEXT property may be the children.
    // A Radix text part (SheetTitle, DialogDescription) lists only asChild, yet its text is
    // its child. Only a part with no other prop qualifies, so a richer component with asChild
    // still has to map its TEXT properties.
    const textPart = Object.keys(props).every((key) => key === 'asChild' || key === 'className');
    let childrenText = Boolean(props.children || (props.asChild && textPart)) && !template;
    // figma/mapping-overrides.json may record code values that Figma does not draw, with one
    // reason. Only for a component with no Code Connect template: a template records its own.
    const recordedCodeOnly = template ? {} : (overrides.get(nodeId)?.codeOnly ?? {});
    for (const [name, type, figmaDefault, options] of node.props ?? []) {
      check('properties');
      const problem = propertyNameProblem(name);
      if (problem) {
        add('property-name', component.name, `Figma property "${name}": ${problem}.`, {
          key: name,
        });
      }
      const entry = template?.[name];
      const propName = entry?.prop ?? (props[camel(name)] ? camel(name) : null);
      if (propName) mappedProps.add(propName.split('.').pop());
      const prop = propName ? props[propName] : null;

      check('properties');
      // check-code-connect holds every registry entry to this read and type-checks what it
      // renders, so a property the registry has is accounted for (a prop, a child, or a reason).
      const recorded = Boolean(entry);
      const toggle = type === 'BOOLEAN' && /^Show /.test(name);
      const statePreview = type === 'VARIANT' && name === 'State';
      const isChildren = !propName && type === 'TEXT' && childrenText;
      if (isChildren) childrenText = false;
      if (!propName && !recorded && !toggle && !statePreview && !isChildren) {
        add(
          'property-not-in-code',
          component.name,
          `Figma property "${name}" (${type}) maps to no prop of ${component.name} and has no recorded reason.`,
          { key: name },
        );
      }
      if (type !== 'VARIANT' || !prop || prop.type !== 'enum') continue;

      const values = entry?.values ?? {};
      const codeOnly = new Set([
        ...Object.keys(entry?.codeOnly ?? {}),
        ...(recordedCodeOnly[name]?.values ?? []),
      ]);
      // Only an optional prop with no default can be "not set".
      const unset = prop.optional === true && prop.default === undefined;
      const codeValues = prop.values ?? [];
      for (const option of options) {
        check('variants');
        if (values[option] !== undefined || codeValues.includes(option)) continue;
        // Figma's default option of an optional prop is "the prop is not set" (Tone=none).
        if (option === figmaDefault && unset) continue;
        const sameLetters = codeValues.find((v) => v.toLowerCase() === option.toLowerCase());
        add(
          sameLetters ? 'option-case' : 'option-not-in-code',
          component.name,
          sameLetters
            ? `${name}=${option} in Figma is ${propName}="${sameLetters}" in code.`
            : `Figma has ${name}=${option}; ${propName} accepts ${codeValues.join(', ')}.`,
          { key: `${name}=${option}` },
        );
      }
      const drawn = new Set(options.map((o) => values[o] ?? o).map((o) => o.toLowerCase()));
      if (unset) drawn.add(String(figmaDefault).toLowerCase());
      check('variants');
      const notDrawn = codeValues.filter((v) => !drawn.has(v.toLowerCase()) && !codeOnly.has(v));
      if (notDrawn.length) {
        add(
          'option-not-in-figma',
          component.name,
          `Code has ${propName}=${notDrawn.join(', ')}; the Figma property ${name} draws ${options.join(', ')}.`,
          { key: `${name}:${setKey(notDrawn)}` },
        );
      }
      if (prop.default !== undefined && !codeOnly.has(prop.default)) {
        check('variants');
        const figmaValue = values[figmaDefault] ?? figmaDefault;
        if (String(figmaValue).toLowerCase() !== String(prop.default).toLowerCase()) {
          add(
            'default-mismatch',
            component.name,
            `${name} defaults to ${figmaDefault} in Figma; ${propName} defaults to ${prop.default} in code.`,
            { key: name },
          );
        }
      }
    }
    for (const axis of CONTRACT_AXES) {
      if (props[axis]?.type !== 'enum' || !node.props) continue;
      check('variants');
      if (mappedProps.has(axis)) continue;
      add(
        'axis-not-in-figma',
        component.name,
        `Code has the ${axis} axis (${props[axis].values.join(', ')}); the Figma component has no property for it.`,
        { key: axis },
      );
    }

    // ── nesting ────────────────────────────────────────────────────────────
    for (const nestedName of node.nests ?? []) {
      const nested = byName.get(nestedName);
      // Icon is an asset family (the icons subpath), not a component a file imports.
      if (!nested || nested.name === component.name || nestedName === 'Icon') continue;
      check('nesting');
      // A Code Connect template that passes the nested component in, as a prop value or as the
      // children, shows it is slot content (EmptyState's action, Dock's children): the parent
      // takes it, it does not render it.
      const tpl = templates[component.name];
      const passedIn = new RegExp(`<${nestedName}[\\s/>]`);
      const slotContent =
        Boolean(tpl) && passedIn.test(JSON.stringify([tpl.properties ?? {}, tpl.children ?? '']));
      const uses =
        slotContent ||
        (nested.consumers ?? []).includes(component.filePath) ||
        nested.filePath === component.filePath;
      if (!uses) {
        add(
          'nesting-mismatch',
          component.name,
          `Figma nests ${nestedName} in ${component.name}; ${component.filePath} does not use ${nestedName}.`,
          { key: nestedName },
        );
      }
    }
  }

  // ── variables ────────────────────────────────────────────────────────────
  if (variables) {
    const liveCollections = new Map(read.variables.collections.map((c) => [c.id, c]));
    // Hirobius/Meta is the release stamp: check:figma-release owns it.
    liveCollections.forEach((c, id) => c.name === RELEASE_STAMP && liveCollections.delete(id));
    for (const committed of variables.snapshotDigest.collections) {
      if (committed.name === RELEASE_STAMP) continue;
      check('variables');
      const live = liveCollections.get(committed.id);
      if (!live || live.hash !== committed.hash) {
        add(
          'variables-changed',
          committed.name,
          live
            ? `The library's ${committed.name} collection changed after figma/snapshot.json was taken.`
            : `figma/snapshot.json has the ${committed.name} collection; the library does not.`,
          { fixHint: 'Re-base figma/snapshot.json (figma/SYNC-PROCEDURE.md, step 2).' },
        );
      }
      liveCollections.delete(committed.id);
    }
    for (const live of liveCollections.values()) {
      check('variables');
      add(
        'variables-changed',
        live.name,
        `The library has the ${live.name} collection; figma/snapshot.json does not.`,
      );
    }
    for (const kind of ['textStyles', 'effectStyles']) {
      check('variables');
      if (read.variables[kind].hash !== variables.snapshotDigest[kind].hash) {
        add(
          'variables-changed',
          kind,
          `The library's ${kind} changed after figma/snapshot.json was taken.`,
        );
      }
    }
    checks.variables.total += variables.drift.total;
    for (const item of variables.drift.missing) {
      add('token-missing-in-figma', item, `Token ${item} has no Figma variable or style.`);
    }
    for (const item of variables.drift.extra) {
      add('token-extra-in-figma', item, `Figma has ${item}; no token builds it.`);
    }
    for (const item of variables.drift.changed) {
      add('token-value-mismatch', item.name, `${item.name}: ${item.detail}`);
    }
    for (const name of variables.unmanaged) {
      check('variables');
      add(
        'collection-not-in-code',
        name,
        `The variable collection "${name}" exists only in Figma: no token builds it, so the token gates do not cover it.`,
      );
    }
  }

  // ── the read itself ──────────────────────────────────────────────────────
  if (today) {
    const age = Math.floor((Date.parse(today) - Date.parse(read.readOn)) / 86400000);
    if (age > maxAgeDays) {
      add(
        'read-stale',
        'figma/parity/read.json',
        `The Figma read is ${age} days old (limit ${maxAgeDays}).`,
        {
          fixHint:
            'pnpm figma:parity --emit-read, run the scripts, then pnpm figma:parity --ingest <files>.',
        },
      );
    }
  }

  // ── baseline ─────────────────────────────────────────────────────────────
  const accepted = baseline.accepted ?? {};
  const seen = new Set(findings.map((f) => f.id));
  for (const finding of findings) {
    if (accepted[finding.id]) finding.accepted = accepted[finding.id].reason;
  }
  const stale = Object.keys(accepted).filter((id) => !seen.has(id));
  const fresh = findings.filter((f) => !f.accepted);

  return {
    findings,
    fresh,
    stale,
    score: score(checks),
    counts: {
      figmaComponents: figma.live.length,
      figmaIcons: figma.icons.length,
      figmaRetired: figma.retired.length,
      emptyPages: figma.emptyPages,
      codeLibraryComponents: code.components.filter((c) => c.class === 'library').length,
      linked: linked.size,
    },
  };
}

function score(checks) {
  const areas = {};
  let total = 0;
  let failed = 0;
  for (const [area, c] of Object.entries(checks)) {
    const bad = Math.min(c.failed, c.total);
    areas[area] = {
      total: c.total,
      passed: c.total - bad,
      percent: percent(c.total - bad, c.total),
    };
    total += c.total;
    failed += bad;
  }
  return { total, passed: total - failed, percent: percent(total - failed, total), areas };
}

const percent = (passed, total) => (total === 0 ? 100 : Math.floor((passed / total) * 1000) / 10);

/** Merge the results of the read scripts into figma/parity/read.json. Throws on a missing or bad part. */
export function ingestRead(results, { fileKey, readOn }) {
  const variables = results.find((r) => r.format === 'parity-variables');
  const parts = results.filter((r) => r.format === 'parity-components');
  if (!variables) throw new Error('No variables result (format parity-variables) among the files.');
  const tooLarge = parts.find((p) => p.tooLarge);
  if (tooLarge) {
    throw new Error(
      `Components part ${tooLarge.part + 1} of ${tooLarge.parts} was too large (${tooLarge.chars} characters). Emit the read with more parts: pnpm figma:parity --emit-read --parts ${tooLarge.parts * 2}.`,
    );
  }
  for (const result of results) {
    if (result.file !== fileKey) {
      throw new Error(
        `A result was read from ${result.file}, which is not the HDS library (${fileKey}).`,
      );
    }
  }
  const count = parts[0]?.parts;
  const have = new Set(parts.map((p) => p.part));
  if (
    !count ||
    parts.some((p) => p.parts !== count) ||
    have.size !== count ||
    parts.length !== count
  ) {
    throw new Error(
      `The components read needs every part once: got part(s) ${[...have].map((p) => p + 1).join(', ')} of ${count ?? '?'}.`,
    );
  }
  const pages = parts.flatMap((p) => p.pages).sort((a, b) => a.index - b.index);
  if (pages.length !== parts[0].pageCount) {
    throw new Error(
      `The parts hold ${pages.length} pages; the file has ${parts[0].pageCount}. The file changed between the parts: read them again.`,
    );
  }
  const { format: _format, file: _file, takenAt, ...digest } = variables;
  return {
    $comment:
      'The parity read: every component of the HDS library (properties, variant options, what its default variant nests) and one hash per variable collection. Written by `pnpm figma:parity --ingest` from the results of the read-only use_figma scripts `pnpm figma:parity --emit-read` prints. Do not edit: read the library again. `pnpm check:figma-parity` compares it with code.',
    fileKey,
    readOn,
    takenAt,
    variables: digest,
    pages: pages.map(({ index: _index, ...page }) => page),
  };
}

/** The report a person reads. */
export function formatParity(result, { verbose = false } = {}) {
  const lines = [];
  const s = result.score;
  lines.push(`Figma <-> code parity: ${s.percent}% (${s.passed} of ${s.total} checks)`);
  for (const area of AREAS) {
    const a = s.areas[area];
    lines.push(`  ${area.padEnd(11)} ${String(a.percent).padStart(5)}%  ${a.passed}/${a.total}`);
  }
  const c = result.counts;
  lines.push(
    `  Figma: ${c.figmaComponents} components, ${c.figmaIcons} icons, ${c.figmaRetired} retired. Code: ${c.codeLibraryComponents} library components. Linked: ${c.linked}.`,
  );
  const show = verbose ? result.findings : result.fresh;
  for (const severity of SEVERITIES) {
    const rows = show.filter((f) => f.severity === severity);
    if (rows.length === 0) continue;
    lines.push('', `${severity.toUpperCase()} (${rows.length})`);
    for (const f of rows) {
      lines.push(`  ${f.accepted ? '·' : '✗'} [${f.fix} fix] ${f.id}`);
      lines.push(`      ${f.detail}`);
      if (f.fixHint) lines.push(`      Fix: ${f.fixHint}`);
      if (f.accepted) lines.push(`      Accepted: ${f.accepted}`);
    }
  }
  const acceptedCount = result.findings.length - result.fresh.length;
  lines.push('');
  if (result.stale.length) {
    lines.push(
      `Stale baseline entries (the drift is gone; remove them from figma/parity/baseline.json):`,
    );
    for (const id of result.stale) lines.push(`  - ${id}`);
  }
  lines.push(
    result.fresh.length === 0 && result.stale.length === 0
      ? `✓ check-figma-parity — no new drift (${acceptedCount} known difference(s) in figma/parity/baseline.json)`
      : `✗ check-figma-parity — ${result.fresh.length} new difference(s), ${result.stale.length} stale baseline entr${result.stale.length === 1 ? 'y' : 'ies'}; ${acceptedCount} known`,
  );
  return lines.join('\n');
}
