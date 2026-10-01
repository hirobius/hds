/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Runs a generated Sync plugin (figma/push/plugin/) as Figma runs it: code.js
 * in an isolated V8 context with the Plugin API (fake-figma.mjs) and nothing
 * from Node, and ui.html's script in another, with a fake DOM, a fake `fetch`
 * and (unless `compression: false`) the web CompressionStream, the two joined
 * by postMessage. Nothing here reaches a network or Figma.
 */
import vm from 'vm';
import { expect } from 'vitest';

const copy = (value) => JSON.parse(JSON.stringify(value));
const scriptOf = (html) => html.match(/<script>([\s\S]*)<\/script>/)[1];

function fakeDocument() {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        textContent: '',
        value: '',
        className: '',
        hidden: false,
        onclick: null,
        focus() {},
        select() {},
        click() {},
      });
    }
    return elements.get(id);
  };
  return { getElementById: element, createElement: () => element('created'), execCommand() {} };
}

/** A fetch that answers with `body` (an object is sent as JSON). */
export const serve =
  (body, status = 200) =>
  async () => ({
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  });

/**
 * Runs one menu command of a generated Sync plugin against `figma` and returns
 * the result it shows, plus every request its window made and every message
 * the code sent the window.
 *
 * @param {Record<string, string>} files  manifest.json, code.js, ui.html
 * @param {string} command
 * @param {object} figma  a fake-figma file
 * @param {{ fetch: Function, typedKey?: string, codeSetTimeout?: Function, compression?: boolean }} options
 */
export async function runSyncPlugin(files, command, figma, options) {
  const { fetch, typedKey, codeSetTimeout = setTimeout, compression = true } = options;
  const results = [];
  const fetches = [];
  const posted = [];
  const doc = fakeDocument();
  const ui = {
    document: doc,
    AbortController,
    // The window's own fetch timeout must not keep the test process alive.
    setTimeout: (fn, ms) => setTimeout(fn, ms).unref(),
    clearTimeout,
    fetch: (url, init) => {
      fetches.push({ url, cache: init && init.cache });
      return fetch(url, init);
    },
    Blob,
    Response,
    btoa,
    parent: {
      postMessage: (message) =>
        setTimeout(() => figma.ui.onmessage && figma.ui.onmessage(message.pluginMessage), 0),
    },
  };
  if (compression) ui.CompressionStream = CompressionStream;
  vm.createContext(ui);
  figma.command = command;
  figma.closePlugin = () => {};
  figma.showUI = (html) => vm.runInContext(scriptOf(html), ui);
  figma.ui = {
    onmessage: null,
    postMessage(message) {
      posted.push(message && message.type);
      if (message && message.type === 'result') results.push(copy(message));
      setTimeout(() => {
        if (ui.onmessage) ui.onmessage({ data: { pluginMessage: message } });
        if (message && message.type === 'mark-form' && typedKey !== undefined) {
          doc.getElementById('key').value = typedKey;
          doc.getElementById('markGo').onclick();
        }
      }, 0);
    },
  };
  vm.runInNewContext(files['code.js'], {
    figma,
    __html__: files['ui.html'],
    setTimeout: codeSetTimeout,
    clearTimeout,
  });
  for (let i = 0; i < 2000 && results.length === 0; i++) await new Promise((r) => setTimeout(r, 5));
  expect(results, `the ${command} command posted no result`).toHaveLength(1);
  return { ...results[0], fetches, posted };
}
