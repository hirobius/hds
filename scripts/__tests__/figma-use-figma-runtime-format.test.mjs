/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#565: the use_figma runtime hands String(fn) back with indentation and
 * blank lines stripped, so a runtime checksum taken over pretty-printed source
 * never matched (snapshot.js failed its own hdsVerifyRuntime; delta.js, emitted
 * compacted, passed). Every generated use_figma script that calls
 * hdsVerifyRuntime must come from the shared emitter, in the form that survives
 * that normalization.
 */
import { describe, it, expect } from 'vitest';
import { parse } from 'acorn';
import { hdsVerifyRuntime, hdsRuntimeFingerprint } from '../lib/figma-runtime.mjs';
import {
  PUSH_CHUNKS,
  buildUseFigmaPushScript,
  buildUseFigmaSnapshotScript,
  compactFunctionText,
} from '../lib/figma-scripts.mjs';
import { fixtureModel } from './helpers/figma-fixture.mjs';

const links = {
  libraryFileKey: 'LIBKEY',
  libraryFileName: 'Lib',
  storybookUrl: 'https://example.test',
  retiredFiles: [{ fileKey: 'OLDKEY', fileName: 'Old' }],
};

/** The runtime's normalization as observed in hds#565: indentation and blank lines gone. */
const runtimeNormalize = (src) =>
  src
    .split('\n')
    .map((line) => line.replace(/^[ \t]+/, ''))
    .filter((line) => line !== '')
    .join('\n');

function scripts() {
  const model = fixtureModel();
  const out = {
    'snapshot.js': buildUseFigmaSnapshotScript(links),
    'push chunk': buildUseFigmaPushScript(model, { scope: PUSH_CHUNKS[0].scope, links }, 'x'),
  };
  return out;
}

/** The function sources and the hdsVerifyRuntime call of a generated script. */
function carried(code) {
  const ast = parse(code, {
    ecmaVersion: 2020,
    sourceType: 'script',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
  });
  const fns = ast.body.filter((n) => n.type === 'FunctionDeclaration');
  const call = ast.body.find(
    (n) => n.type === 'ExpressionStatement' && n.expression.callee?.name === 'hdsVerifyRuntime',
  );
  const [names, sum] = call.expression.arguments;
  return {
    sources: Object.fromEntries(fns.map((n) => [n.id.name, code.slice(n.start, n.end)])),
    names: names.elements.map((e) => e.name),
    checksum: sum.value,
  };
}

describe('use_figma scripts that verify their runtime', () => {
  const generated = scripts();
  for (const [label, code] of Object.entries(generated)) {
    it(`${label} carries every function in the shared compact form`, () => {
      const { sources, names } = carried(code);
      for (const name of names) {
        expect(sources[name]).toBe(compactFunctionText(sources[name]));
        expect(sources[name]).not.toMatch(/^[ \t]/m);
        expect(sources[name]).not.toMatch(/\n\n/);
      }
    });

    it(`${label} passes hdsVerifyRuntime when the runtime normalizes whitespace`, () => {
      const { sources, names, checksum } = carried(code);
      const fns = names.map((n) => ({ toString: () => runtimeNormalize(sources[n]) }));
      expect(() => hdsVerifyRuntime(fns, checksum, false)).not.toThrow();
    });
  }

  /** hds#565 live result: the runtime re-indents continuation lines, 2 spaces per brace depth. */
  const reindent = (src) => {
    let depth = 0;
    return src
      .split('\n')
      .map((line) => {
        const t = line.trim();
        if (/^[})\]]/.test(t)) depth = Math.max(0, depth - 1);
        const out = '  '.repeat(depth) + t;
        const opens = (t.match(/[{([]/g) || []).length;
        const closes = (t.match(/[})\]]/g) || []).length;
        depth = Math.max(0, depth + opens - closes + (/^[})\]]/.test(t) ? 1 : 0));
        return out;
      })
      .join('\n');
  };
  const padded = (src) =>
    src
      .split('\n')
      .map((line, i) => ' '.repeat((i * 7) % 5) + '\t'.repeat(i % 2) + line)
      .join('\n');

  for (const [label, code] of Object.entries(generated)) {
    for (const [how, change] of [
      ['re-indented by brace depth', reindent],
      ['with arbitrary leading spaces', padded],
    ]) {
      it(`${label} passes hdsVerifyRuntime ${how}`, () => {
        const { sources, names, checksum } = carried(code);
        const fns = names.map((n) => ({ toString: () => change(sources[n]) }));
        expect(() => hdsVerifyRuntime(fns, checksum, false)).not.toThrow();
      });
    }

    /** hds#565 live result 2: the runtime also reprints code (spaces inside braces,
     * no trailing commas, no parens around an arrow body assignment). */
    const reprint = (src) =>
      reindent(src)
        .replace(/,\s*([)\]}])/g, '$1')
        .replace(/\{(\S)/g, '{ $1')
        .replace(/=>\s*\(([^()]*=[^()]*\([^()]*\))\)/g, '=> $1')
        .replace(/\?\s*'/g, " ? '");
    it(`${label} passes hdsVerifyRuntime when the runtime reprints the code`, () => {
      const { sources, names, checksum } = carried(code);
      const fns = names.map((n) => ({ toString: () => reprint(sources[n]) }));
      expect(() => hdsVerifyRuntime(fns, checksum, false)).not.toThrow();
    });

    it(`${label} still fails when one identifier in the code changes`, () => {
      const { sources, names, checksum } = carried(code);
      const fns = names.map((n) => ({
        toString: () => (n === 'hdsRound' ? sources[n].replace('rounded', 'roundee') : sources[n]),
      }));
      expect(() => hdsVerifyRuntime(fns, checksum, false)).toThrow(/does not match its checksum/);
    });
  }

  it('compacts the way delta.js always has (one statement per line, no indentation)', () => {
    expect(
      compactFunctionText('function hdsRound(n) {\n  const r = f(\n    n,\n  );\n\n  return r;\n}'),
    ).toBe('function hdsRound(n) {const r = f(n,);\nreturn r;}');
  });

  it('matches the text the live runtime printed for hdsNormalizeValue (2026-10-09)', () => {
    const local =
      "function hdsNormalizeValue(raw) {if (typeof raw === 'number') return hdsRound(raw);\nif (raw && typeof raw === 'object' && typeof raw.r === 'number') {return {r: hdsRound(raw.r),g: hdsRound(raw.g),b: hdsRound(raw.b),a: hdsRound(typeof raw.a === 'number' ? raw.a : 1),};}\nreturn raw;}";
    const live =
      "function hdsNormalizeValue(raw) {if (typeof raw === 'number') return hdsRound(raw);\n    if (raw && typeof raw === 'object' && typeof raw.r === 'number') {return { r: hdsRound(raw.r), g: hdsRound(raw.g), b: hdsRound(raw.b), a: hdsRound(typeof raw.a === 'number' ? raw.a : 1) };}\n    return raw;}";
    expect(hdsRuntimeFingerprint(live)).toBe(hdsRuntimeFingerprint(local));
    const localAgent =
      'async function hdsAgentReadState(figma, file) {const state = await hdsReadState(figma);\nstate.collections.forEach((c) =>\nc.variables.forEach((v) => (v.description = hdsAgentDecode(v.description))),);\nstate.file = Object.assign({}, file);\nreturn state;}';
    const liveAgent =
      'async function hdsAgentReadState(figma, file) {const state = await hdsReadState(figma);\n    state.collections.forEach((c) =>\n    c.variables.forEach((v) => v.description = hdsAgentDecode(v.description)));\n    state.file = Object.assign({}, file);\n    return state;}';
    expect(hdsRuntimeFingerprint(liveAgent)).toBe(hdsRuntimeFingerprint(localAgent));
  });
});
