/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Quiet-hook helpers shared by scripts/hook-run.mjs and scripts/run-gates.mjs.
 * Green hooks print one summary line; a red hook prints only the failing
 * step's output (tail + error-looking lines) and the full-log path.
 */
import fs from 'node:fs';
import path from 'node:path';

const ERROR_LINE = /✗|FAIL|Error/;

/** Last `tail` lines plus any earlier lines that look like errors (deduped, in order). */
export function failureExcerpt(text, tail = 60) {
  const lines = String(text ?? '').split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  if (lines.length <= tail) return lines.join('\n');
  const cut = lines.length - tail;
  const flagged = lines.slice(0, cut).filter((l) => ERROR_LINE.test(l));
  const head = flagged.length
    ? [`… ${cut} earlier lines omitted; error-like ones:`, ...flagged]
    : [`… ${cut} earlier lines omitted`];
  return [...head, ...lines.slice(cut)].join('\n');
}

export function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`;
}

/** Stage label, with a count appended when the output carries a known one. */
export function stageLabel(name, output) {
  if (name === 'test') {
    const m = /Tests\s+(?:\d+ failed \| )?(\d+) passed/.exec(output ?? '');
    if (m) return `test (${m[1]})`;
  }
  return name;
}

export function summaryLine(hook, labels, ms) {
  return `✓ ${hook}: ${labels.join(', ')} (${formatDuration(ms)})`;
}

/** Keep only the newest `keep` logs for `hook` (names sort by timestamp). */
export function pruneLogs(dir, hook, keep = 5) {
  let names;
  try {
    names = fs.readdirSync(dir).filter((n) => n.startsWith(`${hook}-`) && n.endsWith('.log'));
  } catch {
    return;
  }
  names.sort();
  for (const n of names.slice(0, Math.max(0, names.length - keep))) {
    try {
      fs.unlinkSync(path.join(dir, n));
    } catch {
      /* best effort */
    }
  }
}

export function openLog(gitDir, hook) {
  const dir = path.join(gitDir, 'hook-logs');
  fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `${hook}-${ts}.log`);
  fs.writeFileSync(file, '');
  pruneLogs(dir, hook, 5);
  return file;
}

/**
 * Parse a husky hook into stages: an `echo "<name>…"` line opens a stage and
 * the lines under it are its commands (the shape CONTRIBUTING.md's gate table
 * is generated from and tested against). Comments, blanks, `set …` and any
 * line before the first echo (e.g. the quiet-runner guard) are skipped.
 */
export function parseHookStages(text) {
  const stages = [];
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('set ')) continue;
    const echo = line.match(/^echo\s+"(.*)"$/);
    if (echo) stages.push({ title: echo[1].replace(/…$/, '').trim(), commands: [] });
    else if (stages.length) stages.at(-1).commands.push(line);
  }
  return stages.map((s) => ({ ...s, name: shortName(s.commands[0] ?? s.title) }));
}

/** `pnpm test` → test, `node scripts/check-sync-map.mjs --x` → sync-map. */
export function shortName(cmd) {
  const pnpm = /^pnpm\s+(?:exec\s+)?(\S+)/.exec(cmd);
  if (pnpm) return pnpm[1];
  const node = /^node\s+scripts\/(?:check-|verify-)?([\w.-]+?)\.mjs/.exec(cmd);
  if (node) return node[1];
  return cmd.split(/\s+/)[0];
}
