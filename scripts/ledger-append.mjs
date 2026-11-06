/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/ledger-append.mjs — add rows to one session of figma/MCP-LEDGER.md (hds#1297).
 *
 * Rows went into the wrong session table twice (#1291, #1293), because agents edited
 * the ledger with sed on line numbers or on a row prefix that more than one table had.
 * This script finds the session by its heading, so a row can only land in that
 * session's table, then re-sums the day line from each session's total.
 *
 * Usage:
 *   pnpm ledger:append --session "<text in the ## heading>" \
 *     --row "| 17 | `use_figma` | read | ... | ... | OK. |" [--row ...] \
 *     [--total "Session total: 17 calls (...)."]
 *   pnpm ledger:append --new-session "2026-11-06 · session `claude/x`" --row "| 1 | … |" …
 *                                             start a session: dated heading + empty table, then rows
 *   pnpm ledger:append --resum 2026-11-06      only re-sum that day's line
 *
 * --session must match exactly one heading. Each --row must be the next number in
 * that table. --total replaces the section's "Session total:" line (or adds one).
 * The day line ("Calls logged for <date>: …") is rewritten from every session total
 * of that date, in ledger order; it is added below the day's last section when
 * missing. duplicateRowNumbers() backs the check in figma-one-library-rule.test.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LEDGER = join(dirname(fileURLToPath(import.meta.url)), '..', 'figma/MCP-LEDGER.md');

/** Sections: { heading, date, start, end } (start at "## ", end before the next "## "). */
export function sections(text) {
  const out = [];
  const re = /^## (.*)$/gm;
  let m;
  while ((m = re.exec(text))) {
    if (out.length) out[out.length - 1].end = m.index;
    const date = (m[1].match(/^(\d{4}-\d{2}-\d{2}) ·/) || [])[1] || null;
    out.push({ heading: m[1], date, start: m.index, end: text.length });
  }
  return out;
}

/** The row numbers a table row's first cell names: "7" -> [7], "4–8" or "9-20" -> the range. */
export function rowNumbers(line) {
  const cell = (line.match(/^\|\s*([^|]*?)\s*\|/) || [])[1] || '';
  const range = cell.match(/^(\d+)\s*[–-]\s*(\d+)$/);
  if (range) {
    const [a, b] = [Number(range[1]), Number(range[2])];
    return b >= a && b - a < 500 ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [];
  }
  return /^\d+$/.test(cell) ? [Number(cell)] : [];
}

/**
 * Every table that repeats a row number: [{ heading, numbers }]. A table is a run of
 * "|" lines; a prose line between runs starts a new table (a resumed session may
 * number from 1 again under the same heading).
 */
export function duplicateRowNumbers(text) {
  const out = [];
  for (const s of sections(text)) {
    let seen = new Set();
    const dup = new Set();
    for (const line of text.slice(s.start, s.end).split('\n')) {
      if (!line.startsWith('|')) {
        if (line.trim()) seen = new Set();
        continue;
      }
      for (const n of rowNumbers(line)) (seen.has(n) ? dup : seen).add(n);
    }
    if (dup.size) out.push({ heading: s.heading, numbers: [...dup].sort((a, b) => a - b) });
  }
  return out;
}

function findSection(text, match) {
  const hits = sections(text).filter((s) => s.heading.includes(match));
  if (hits.length !== 1)
    throw new Error(
      `--session "${match}" matches ${hits.length} headings${hits.length ? ': ' + hits.map((h) => h.heading).join(' | ') : ''}; it must match exactly one.`,
    );
  return hits[0];
}

/** Append rows (and optionally set the total) in the one section whose heading contains `match`. */
export function appendRows(text, match, rows, total = null) {
  const s = findSection(text, match);
  const lines = text.slice(s.start, s.end).split('\n');
  let last = -1;
  lines.forEach((l, i) => {
    if (l.startsWith('|')) last = i;
  });
  if (last === -1) throw new Error(`Section "${s.heading}" has no table.`);
  let next = Math.max(0, ...lines.flatMap((l) => (l.startsWith('|') ? rowNumbers(l) : []))) + 1;
  for (const r of rows) {
    const n = rowNumbers(r);
    if (!n.length || n[0] !== next)
      throw new Error(`Row "${r.slice(0, 40)}…" must start with number ${next} in "${s.heading}".`);
    next = n[n.length - 1] + 1;
  }
  lines.splice(last + 1, 0, ...rows);
  if (total !== null) {
    if (!/^Session total:/.test(total))
      throw new Error('--total must start with "Session total:".');
    const t = lines.findIndex((l) => /^\**Session total:/.test(l));
    if (t === -1) lines.splice(last + 1 + rows.length, 0, '', total);
    else lines[t] = total;
  }
  return text.slice(0, s.start) + lines.join('\n') + text.slice(s.end);
}

const TABLE_HEAD =
  '| # | Tool | Kind | Target | Why | Result |\n| - | ---- | ---- | ------ | --- | ------ |';

/**
 * Add "## <heading>" with an empty table: after the last section of the same day, or at
 * the end of the ledger for a new day. The heading must start with its date.
 */
export function newSession(text, heading) {
  const date = (heading.match(/^(\d{4}-\d{2}-\d{2}) · \S/) || [])[1];
  if (!date)
    throw new Error(`--new-session "${heading}" must start with a date: "YYYY-MM-DD · …".`);
  if (sections(text).some((s) => s.heading === heading))
    throw new Error(`Session "${heading}" already exists; use --session.`);
  const block = `## ${heading}\n\n${TABLE_HEAD}\n`;
  const last = sections(text)
    .filter((s) => s.date === date)
    .pop();
  if (!last) return text.replace(/\s*$/, '') + '\n\n' + block;
  const head = text.slice(0, last.end).replace(/\s*$/, '');
  const tail = text.slice(last.end);
  return head + '\n\n' + block + (tail ? '\n' + tail : '');
}

/** Rewrite the "Calls logged for <date>" line from that date's session totals, in ledger order. */
export function resumDay(text, date) {
  const daySections = sections(text).filter((s) => s.date === date);
  if (!daySections.length) throw new Error(`No sessions dated ${date}.`);
  const totals = daySections.map((s) => {
    const t = text
      .slice(s.start, s.end)
      .replace(/\s+/g, ' ')
      .match(/Session total: (\d+)\b/);
    if (!t) throw new Error(`Session "${s.heading}" has no "Session total: N".`);
    return Number(t[1]);
  });
  const sum = totals.reduce((a, b) => a + b, 0);
  const terms =
    totals.length === 1
      ? String(totals[0])
      : `${totals.slice(0, -1).join(', ')} and ${totals[totals.length - 1]}`;
  const line = `Calls logged for ${date}: ${sum} of 200 (${terms}).`;
  const re = new RegExp(`^Calls logged for ${date}: .*$\\n?`, 'gm');
  const stripped = text.replace(re, '');
  // Re-find the last section of the day in the stripped text and put the line at its end.
  const last = sections(stripped)
    .filter((s) => s.date === date)
    .pop();
  const body = stripped.slice(last.start, last.end).replace(/\s*$/, '');
  const tail = stripped.slice(last.end);
  return stripped.slice(0, last.start) + body + '\n\n' + line + '\n' + (tail ? '\n' + tail : '');
}

export function run(argv, { file = LEDGER, log = console.log } = {}) {
  const all = (f) => argv.flatMap((a, i) => (a === f ? [argv[i + 1]] : []));
  const one = (f) => all(f)[0] ?? null;
  let text = readFileSync(file, 'utf8');
  let date = one('--resum');
  if (one('--new-session')) text = newSession(text, one('--new-session'));
  const session = one('--new-session') || one('--session');
  if (session) {
    text = appendRows(text, session, all('--row'), one('--total'));
    date = findSection(text, session).date;
  }
  if (!date)
    throw new Error(
      'Nothing to do: pass --session, --new-session (dated heading) or --resum <date>.',
    );
  text = resumDay(text, date);
  writeFileSync(file, text);
  log(text.match(new RegExp(`^Calls logged for ${date}: .*$`, 'm'))[0]);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = run(process.argv.slice(2));
  } catch (e) {
    console.error(`✗ ledger:append — ${e.message}`);
    process.exitCode = 1;
  }
}
