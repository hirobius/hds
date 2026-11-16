/**
 * The release notes behind /changelog and /changelog/<version>: CHANGELOG.md,
 * as Changesets writes it, cut into one record per release. Pure: the caller
 * passes the file text, so tests need no filesystem. Nothing on these pages is
 * typed by hand; a release with no notes is not invented.
 *
 * The ### Upgrade block is left out: /upgrade/<version> owns those steps.
 */

/** A paragraph, a list (one level, as the changelog writes them), a code block or a table. */
export type NoteBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'pre'; text: string }
  | { type: 'table'; head: string[]; rows: string[][] };

export interface NoteEntry {
  /** The changeset's short commit hash, when the line starts with one. */
  ref: string | null;
  blocks: NoteBlock[];
}

export interface NoteGroup {
  /** "Major changes", "Minor changes" or "Patch changes", as the changelog heads them. */
  title: string;
  entries: NoteEntry[];
}

export interface ReleaseNotes {
  version: string;
  groups: NoteGroup[];
}

const VERSION = /^## (\d+\.\d+\.\d+)\s*$/;
const GROUP = /^### (.+?)\s*$/;
const ENTRY = /^- (?:([0-9a-f]{7,40}): )?(.*)$/;

/** Every release in CHANGELOG.md, newest first (the file's order). */
export function parseChangelog(changelog: string): ReleaseNotes[] {
  const releases: ReleaseNotes[] = [];
  let group: NoteGroup | null = null;
  let entry: { ref: string | null; lines: string[] } | null = null;
  let skip = false;

  const closeEntry = () => {
    if (entry && group) group.entries.push({ ref: entry.ref, blocks: blocksOf(entry.lines) });
    entry = null;
  };

  for (const line of changelog.split('\n')) {
    const version = VERSION.exec(line);
    if (version) {
      closeEntry();
      releases.push({ version: version[1]!, groups: [] });
      group = null;
      continue;
    }
    const release = releases.at(-1);
    if (!release) continue;
    const heading = GROUP.exec(line);
    if (heading) {
      closeEntry();
      skip = /^upgrade$/i.test(heading[1]!);
      group = skip ? null : { title: sentenceCase(heading[1]!), entries: [] };
      if (group) release.groups.push(group);
      continue;
    }
    if (skip || !group) continue;
    const start = ENTRY.exec(line);
    if (start) {
      closeEntry();
      entry = { ref: start[1] ?? null, lines: [start[2]!] };
      continue;
    }
    // A continuation line is indented two spaces under its entry; a blank line separates blocks.
    if (entry && (line.startsWith('  ') || line.trim() === '')) entry.lines.push(line.slice(2));
  }
  closeEntry();
  for (const release of releases) {
    release.groups = release.groups.filter((g) => g.entries.length > 0);
  }
  return releases;
}

/** "Minor Changes" -> "Minor changes". */
function sentenceCase(title: string): string {
  return title.charAt(0) + title.slice(1).toLowerCase();
}

/** An entry's lines into paragraphs and lists. */
function blocksOf(lines: string[]): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  let para: string[] = [];
  let list: string[] | null = null;
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    if (list) blocks.push({ type: 'ul', items: list });
    para = [];
    list = null;
  };
  let fence: string[] | null = null;
  let table: string[][] | null = null;
  const cells = (row: string) =>
    row
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (fence) {
      if (line.trim().startsWith('```')) {
        blocks.push({ type: 'pre', text: fence.join('\n') });
        fence = null;
      } else fence.push(line);
      continue;
    }
    if (line.trim().startsWith('```')) {
      flush();
      fence = [];
      continue;
    }
    if (line.trim().startsWith('|')) {
      if (!table) flush();
      // The |---|---| row only marks the head; it holds no cells.
      if (!/^\|[\s:|-]+\|$/.test(line.trim())) (table ??= []).push(cells(line));
      continue;
    }
    if (table) {
      blocks.push({ type: 'table', head: table[0]!, rows: table.slice(1) });
      table = null;
    }
    if (line.trim() === '') {
      flush();
      continue;
    }
    if (line.startsWith('- ')) {
      if (para.length) {
        blocks.push({ type: 'p', text: para.join(' ') });
        para = [];
      }
      (list ??= []).push(line.slice(2));
      continue;
    }
    if (list && line.startsWith('  ')) {
      list[list.length - 1] += ` ${line.trim()}`;
      continue;
    }
    if (list) flush();
    para.push(line.trim());
  }
  if (table) blocks.push({ type: 'table', head: table[0]!, rows: table.slice(1) });
  flush();
  return blocks;
}

/** Inline markdown the changelog uses: `code`, **bold** and [links](url). */
export type InlinePart =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'link'; text: string; href: string };

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
/** Changesets escapes markdown characters in prose (hds-link\_\_icon). */
const unescape = (text: string) => text.replace(/\\([\\`*_[\]#<>()|-])/g, '$1');

export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) parts.push({ type: 'text', text: unescape(text.slice(last, m.index)) });
    if (m[1] !== undefined) parts.push({ type: 'code', text: m[1] });
    else if (m[2] !== undefined) parts.push({ type: 'strong', text: unescape(m[2]) });
    else parts.push({ type: 'link', text: unescape(m[3]!), href: m[4]! });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', text: unescape(text.slice(last)) });
  return parts;
}
