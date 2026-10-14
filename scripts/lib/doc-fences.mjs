/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Pull the ```tsx fences out of a Markdown/plain-text doc so the consumer smoke
 * (scripts/smoke-consumer.mjs, hds#457) can typecheck them against the packed
 * tarball. Deliberately format-tolerant: it reads fences, never prose, so an
 * edit to the surrounding text cannot break extraction.
 *
 * Exempt (a sample that shows the OLD API on purpose):
 *   - a fence whose info string has the word `before` (```tsx before)
 *   - inside a fence, the lines from a `// Before` comment up to the next
 *     `// After` / `// Or` / `// Now` comment are blanked (line numbers kept)
 */

const OPEN = /^(\s*)(`{3,}|~{3,})\s*tsx\b(.*)$/;

export function extractTsxFences(text, file) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const open = OPEN.exec(lines[i]);
    if (!open) continue;
    const [, indent, fence, info] = open;
    const body = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const t = lines[j].trim();
      if (t.startsWith(fence[0].repeat(fence.length)) && /^(`+|~+)$/.test(t)) break;
      body.push(lines[j].startsWith(indent) ? lines[j].slice(indent.length) : lines[j].trimStart());
    }
    const exempt = /\bbefore\b/i.test(info);
    if (!exempt) out.push({ file, line: i + 1, code: blankBeforeRegions(body).join('\n') });
    i = j;
  }
  return out;
}

function blankBeforeRegions(body) {
  let skipping = false;
  return body.map((l) => {
    if (/^\s*\/\/\s*before\b/i.test(l)) skipping = true;
    else if (skipping && /^\s*\/\/\s*(after|or|now)\b/i.test(l)) skipping = false;
    return skipping ? '' : l;
  });
}
