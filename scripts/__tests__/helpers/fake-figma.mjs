/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * An in-memory stand-in for the slice of the Figma Plugin API that
 * `pnpm figma:push` and `pnpm figma:snapshot` use (scripts/lib/figma-runtime.mjs).
 *
 * It enforces the Plugin API rules the runtime depends on, as documented in
 * the Plugin API typings and the figma-use skill references:
 *   - a new collection starts with one mode named "Mode 1"
 *   - variable names are unique within a collection
 *   - a value must match the variable's type; an alias must point at an
 *     existing variable of the same type
 *   - FLOAT values and color channels are stored as 32-bit floats
 *   - text style font properties need the style's font loaded first, and a
 *     font must exist before it can be loaded
 *   - modes per collection are capped by plan
 *
 * Every write is appended to `figma.writes` so tests can assert ordering and
 * that a second push writes nothing.
 */

const ALNUM_NAMESPACE = /^[A-Za-z0-9_.]{3,}$/;
const TEXT_BINDING_TYPES = {
  fontFamily: 'STRING',
  fontStyle: 'STRING',
  fontSize: 'FLOAT',
  fontWeight: 'FLOAT',
  letterSpacing: 'FLOAT',
  lineHeight: 'FLOAT',
  paragraphSpacing: 'FLOAT',
  paragraphIndent: 'FLOAT',
};

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
const fontKey = (font) => `${font.family}|${font.style}`;

function pluginData({ supported = true, owner, log }) {
  const shared = new Map();
  return {
    getSharedPluginData(namespace, key) {
      if (!supported) throw new Error(`in getSharedPluginData: not supported on ${owner}`);
      return shared.get(`${namespace}:${key}`) ?? '';
    },
    setSharedPluginData(namespace, key, value) {
      if (!supported) throw new Error(`in setSharedPluginData: not supported on ${owner}`);
      if (!ALNUM_NAMESPACE.test(namespace)) throw new Error('namespace must be 3+ alphanumerics');
      log(`${owner}.pluginData:${key}`);
      if (value === '') shared.delete(`${namespace}:${key}`);
      else shared.set(`${namespace}:${key}`, String(value));
    },
  };
}

/**
 * @param {object} [options]
 * @param {string} [options.fileName]
 * @param {Array<{family: string, style: string}>} [options.fonts]  Fonts available to the editor.
 * @param {number} [options.modeLimit]  Modes per collection (Professional: 10).
 * @param {boolean} [options.variablePluginData]  false makes plugin data on variables throw.
 */
export function createFakeFigma({
  fileName = 'HDS scratch file',
  fonts = [
    { family: 'Inter', style: 'Regular' },
    { family: 'Satoshi', style: 'Medium' },
    { family: 'Satoshi', style: 'Bold' },
  ],
  modeLimit = 10,
  variablePluginData = true,
} = {}) {
  let nextId = 1;
  const id = (prefix) => `${prefix}:1:${nextId++}`;
  const writes = [];
  const log = (entry) => writes.push(entry);
  const collections = new Map();
  const variables = new Map();
  const textStyles = new Map();
  const effectStyles = new Map();
  const loadedFonts = new Set();
  const available = new Set(fonts.map(fontKey));

  // ── Variables ──────────────────────────────────────────────────────────────
  const assertUniqueName = (collectionId, name, selfId) => {
    for (const v of variables.values()) {
      if (v.id !== selfId && v.variableCollectionId === collectionId && v.name === name) {
        throw new Error(`Variable name "${name}" already exists in this collection`);
      }
    }
  };

  function storeValue(variable, value) {
    if (value && value.type === 'VARIABLE_ALIAS') {
      const target = variables.get(value.id);
      if (!target) throw new Error(`Alias target ${value.id} does not exist`);
      if (target.id === variable.id) throw new Error('A variable cannot alias itself');
      if (target.resolvedType !== variable.resolvedType) {
        throw new Error(
          `Cannot alias a ${target.resolvedType} variable from ${variable.resolvedType}`,
        );
      }
      return { type: 'VARIABLE_ALIAS', id: value.id };
    }
    switch (variable.resolvedType) {
      case 'COLOR': {
        const channels = ['r', 'g', 'b'];
        if (
          !value ||
          channels.some((k) => typeof value[k] !== 'number' || value[k] < 0 || value[k] > 1)
        ) {
          throw new Error(`Invalid COLOR value ${JSON.stringify(value)}`);
        }
        return {
          r: Math.fround(value.r),
          g: Math.fround(value.g),
          b: Math.fround(value.b),
          a: Math.fround(value.a ?? 1),
        };
      }
      case 'FLOAT':
        if (typeof value !== 'number')
          throw new Error(`Invalid FLOAT value ${JSON.stringify(value)}`);
        return Math.fround(value);
      case 'STRING':
        if (typeof value !== 'string')
          throw new Error(`Invalid STRING value ${JSON.stringify(value)}`);
        return value;
      default:
        if (typeof value !== 'boolean')
          throw new Error(`Invalid BOOLEAN value ${JSON.stringify(value)}`);
        return value;
    }
  }

  const DEFAULTS = { COLOR: { r: 0, g: 0, b: 0, a: 1 }, FLOAT: 0, STRING: '', BOOLEAN: false };

  function makeVariable(name, collection, resolvedType) {
    assertUniqueName(collection.id, name, null);
    const variableId = id('VariableID');
    let currentName = name;
    let scopes = ['ALL_SCOPES'];
    const values = new Map(collection.modes.map((m) => [m.modeId, clone(DEFAULTS[resolvedType])]));
    const codeSyntax = {};
    const variable = {
      id: variableId,
      resolvedType,
      variableCollectionId: collection.id,
      remote: false,
      description: '',
      hiddenFromPublishing: false,
      get name() {
        return currentName;
      },
      set name(next) {
        assertUniqueName(collection.id, next, variableId);
        log(`variable.name:${currentName}->${next}`);
        currentName = next;
      },
      get scopes() {
        return [...scopes];
      },
      set scopes(next) {
        log(`variable.scopes:${currentName}`);
        scopes = [...next];
      },
      get codeSyntax() {
        return { ...codeSyntax };
      },
      setVariableCodeSyntax(platform, value) {
        log(`variable.codeSyntax:${currentName}`);
        codeSyntax[platform] = value;
      },
      removeVariableCodeSyntax(platform) {
        log(`variable.codeSyntax:${currentName}`);
        delete codeSyntax[platform];
      },
      get valuesByMode() {
        return Object.fromEntries([...values].map(([k, v]) => [k, clone(v)]));
      },
      setValueForMode(modeId, value) {
        if (!collection.modes.some((m) => m.modeId === modeId)) {
          throw new Error(`Mode ${modeId} is not in collection ${collection.name}`);
        }
        log(`variable.value:${currentName}`);
        values.set(modeId, storeValue(variable, value));
      },
      remove() {
        log(`variable.remove:${currentName}`);
        variables.delete(variable.id);
      },
      _values: values,
      ...pluginData({ supported: variablePluginData, owner: 'variable', log }),
    };
    // description / hiddenFromPublishing writes are logged through a proxy so
    // tests see them; reads stay plain.
    const proxy = new Proxy(variable, {
      set(target, prop, value) {
        if (prop === 'description' || prop === 'hiddenFromPublishing') {
          log(`variable.${prop}:${target.name}`);
        }
        return Reflect.set(target, prop, value);
      },
    });
    variables.set(variable.id, proxy);
    return proxy;
  }

  function makeCollection(name) {
    const modes = [{ modeId: id('Mode'), name: 'Mode 1' }];
    const collection = {
      id: id('VariableCollectionId'),
      name,
      remote: false,
      isExtension: false,
      hiddenFromPublishing: false,
      get modes() {
        return modes.map((m) => ({ ...m }));
      },
      get defaultModeId() {
        return modes[0].modeId;
      },
      get variableIds() {
        return [...variables.values()]
          .filter((v) => v.variableCollectionId === collection.id)
          .map((v) => v.id);
      },
      addMode(modeName) {
        if (modes.length >= modeLimit) {
          throw new Error(`Limited to ${modeLimit} modes only`);
        }
        log(`collection.addMode:${collection.name}:${modeName}`);
        const mode = { modeId: id('Mode'), name: modeName };
        for (const v of variables.values()) {
          if (v.variableCollectionId === collection.id) {
            v._values.set(mode.modeId, clone(v._values.get(modes[0].modeId)));
          }
        }
        modes.push(mode);
        return mode.modeId;
      },
      renameMode(modeId, next) {
        const mode = modes.find((m) => m.modeId === modeId);
        if (!mode) throw new Error(`No mode ${modeId}`);
        log(`collection.renameMode:${collection.name}:${mode.name}->${next}`);
        mode.name = next;
      },
      removeMode(modeId) {
        if (modes.length === 1) throw new Error('Cannot remove the only mode');
        const index = modes.findIndex((m) => m.modeId === modeId);
        if (index < 0) throw new Error(`No mode ${modeId}`);
        log(`collection.removeMode:${collection.name}:${modes[index].name}`);
        modes.splice(index, 1);
        for (const v of variables.values()) v._values.delete(modeId);
      },
      remove() {
        log(`collection.remove:${collection.name}`);
        for (const v of [...variables.values()]) {
          if (v.variableCollectionId === collection.id) variables.delete(v.id);
        }
        collections.delete(collection.id);
      },
      ...pluginData({ owner: 'collection', log }),
    };
    const proxy = new Proxy(collection, {
      set(target, prop, value) {
        if (prop === 'name' || prop === 'hiddenFromPublishing') {
          log(`collection.${prop}:${target.name}`);
        }
        return Reflect.set(target, prop, value);
      },
    });
    collections.set(collection.id, proxy);
    return proxy;
  }

  const resolveCollection = (ref) => {
    const collection = typeof ref === 'string' ? collections.get(ref) : collections.get(ref?.id);
    if (!collection) throw new Error('Collection not found');
    return collection;
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const requireLoaded = (font, what) => {
    if (!loadedFonts.has(fontKey(font))) {
      throw new Error(`Cannot write to ${what} with unloaded font "${font.family} ${font.style}"`);
    }
  };

  function makeTextStyle() {
    let fontName = { family: 'Inter', style: 'Regular' };
    const state = {
      fontSize: 12,
      lineHeight: { unit: 'AUTO' },
      letterSpacing: { unit: 'PERCENT', value: 0 },
      textCase: 'ORIGINAL',
    };
    const bound = {};
    const style = {
      id: id('S'),
      type: 'TEXT',
      name: '',
      description: '',
      get fontName() {
        return { ...fontName };
      },
      set fontName(next) {
        requireLoaded(next, 'text style');
        log(`textStyle.fontName:${style.name}`);
        fontName = { family: next.family, style: next.style };
      },
      get boundVariables() {
        return clone(bound);
      },
      setBoundVariable(field, variable) {
        requireLoaded(fontName, 'text style');
        if (!(field in TEXT_BINDING_TYPES)) throw new Error(`Cannot bind ${field}`);
        log(`textStyle.bind:${style.name}:${field}`);
        if (variable === null) {
          delete bound[field];
          return;
        }
        if (variable.resolvedType !== TEXT_BINDING_TYPES[field]) {
          throw new Error(`${field} needs a ${TEXT_BINDING_TYPES[field]} variable`);
        }
        bound[field] = { type: 'VARIABLE_ALIAS', id: variable.id };
      },
      remove() {
        log(`textStyle.remove:${style.name}`);
        textStyles.delete(style.id);
      },
      ...pluginData({ owner: 'textStyle', log }),
    };
    for (const key of Object.keys(state)) {
      Object.defineProperty(style, key, {
        enumerable: true,
        get: () => clone(state[key]),
        set: (next) => {
          requireLoaded(fontName, 'text style');
          log(`textStyle.${key}:${style.name}`);
          state[key] = key === 'fontSize' ? Math.fround(next) : clone(next);
        },
      });
    }
    const proxy = new Proxy(style, {
      set(target, prop, value) {
        if (prop === 'name' || prop === 'description') log(`textStyle.${prop}:${target.name}`);
        return Reflect.set(target, prop, value);
      },
    });
    textStyles.set(style.id, proxy);
    return proxy;
  }

  function makeEffectStyle() {
    let effects = [];
    const style = {
      id: id('S'),
      type: 'EFFECT',
      name: '',
      description: '',
      get effects() {
        return clone(effects);
      },
      set effects(next) {
        log(`effectStyle.effects:${style.name}`);
        effects = clone(next).map((effect) =>
          effect.color
            ? {
                ...effect,
                color: Object.fromEntries(
                  Object.entries(effect.color).map(([k, v]) => [k, Math.fround(v)]),
                ),
              }
            : effect,
        );
      },
      remove() {
        log(`effectStyle.remove:${style.name}`);
        effectStyles.delete(style.id);
      },
      ...pluginData({ owner: 'effectStyle', log }),
    };
    const proxy = new Proxy(style, {
      set(target, prop, value) {
        if (prop === 'name' || prop === 'description') log(`effectStyle.${prop}:${target.name}`);
        return Reflect.set(target, prop, value);
      },
    });
    effectStyles.set(style.id, proxy);
    return proxy;
  }

  // ── The figma global ───────────────────────────────────────────────────────
  const figma = {
    writes,
    fileKey: undefined,
    root: { name: fileName, ...pluginData({ owner: 'root', log }) },
    notify() {
      throw new Error('not implemented');
    },
    variables: {
      getLocalVariableCollectionsAsync: async () => [...collections.values()],
      getLocalVariablesAsync: async () => [...variables.values()],
      getVariableByIdAsync: async (variableId) => variables.get(variableId) ?? null,
      getVariableCollectionByIdAsync: async (collectionId) => collections.get(collectionId) ?? null,
      createVariableCollection(name) {
        log(`createVariableCollection:${name}`);
        return makeCollection(name);
      },
      createVariable(name, collectionRef, resolvedType) {
        log(`createVariable:${name}`);
        return makeVariable(name, resolveCollection(collectionRef), resolvedType);
      },
      createVariableAlias: (variable) => ({ type: 'VARIABLE_ALIAS', id: variable.id }),
    },
    getLocalTextStylesAsync: async () => [...textStyles.values()],
    getLocalEffectStylesAsync: async () => [...effectStyles.values()],
    createTextStyle() {
      log('createTextStyle');
      return makeTextStyle();
    },
    createEffectStyle() {
      log('createEffectStyle');
      return makeEffectStyle();
    },
    listAvailableFontsAsync: async () => fonts.map((fontName) => ({ fontName: { ...fontName } })),
    async loadFontAsync(font) {
      if (!available.has(fontKey(font))) {
        throw new Error(`The font "${font.family} ${font.style}" could not be loaded`);
      }
      loadedFonts.add(fontKey(font));
    },
  };
  return figma;
}
