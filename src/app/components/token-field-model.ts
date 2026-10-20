/**
 * The edit model behind TokenField (hds#826): pure functions over a plain
 * string and string offsets. A token is any match of the field's pattern; the
 * field draws each one as an atomic chip, and every edit that could split a
 * chip goes through here, so a token is inserted, stepped over and removed as
 * one unit. Ported from job-hunt's templateEditor helpers.
 */

/** A short bracketed name on one line: `[Company]`, `[Hiring manager]`. */
export const DEFAULT_TOKEN_PATTERN = /\[([^[\]\n]{1,40})\]/g;

/** One run of the value: plain text, or one token. Joined back, the runs are the value. */
export type TokenSegment = { kind: 'text'; text: string } | { kind: 'token'; token: string };

/** An edit's result: the new value and where the caret goes. */
export interface TokenEdit {
  value: string;
  caret: number;
}

function globalPattern(pattern: RegExp): RegExp {
  return pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
}

/** Split the value into text runs and tokens. Empty matches are text. */
export function splitTokens(
  value: string,
  pattern: RegExp = DEFAULT_TOKEN_PATTERN,
): TokenSegment[] {
  const out: TokenSegment[] = [];
  let last = 0;
  for (const m of value.matchAll(globalPattern(pattern))) {
    const at = m.index ?? 0;
    if (!m[0] || !(m[1] ?? m[0]).trim()) continue;
    if (at > last) out.push({ kind: 'text', text: value.slice(last, at) });
    out.push({ kind: 'token', token: m[0] });
    last = at + m[0].length;
  }
  if (last < value.length) out.push({ kind: 'text', text: value.slice(last) });
  return out;
}

/** Where each token sits, as [start, end) offsets. */
export function tokenSpans(value: string, pattern?: RegExp): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let at = 0;
  for (const s of splitTokens(value, pattern)) {
    const len = s.kind === 'text' ? s.text.length : s.token.length;
    if (s.kind === 'token') spans.push([at, at + len]);
    at += len;
  }
  return spans;
}

/** Put `text` over [start, end); the caret lands after it. Offsets are clamped. */
export function insertAt(value: string, start: number, end: number, text: string): TokenEdit {
  const from = Math.max(0, Math.min(start, value.length));
  const to = Math.max(from, Math.min(end, value.length));
  return { value: value.slice(0, from) + text + value.slice(to), caret: from + text.length };
}

/** Backspace just after (or Delete just before) a token removes all of it; else null. */
export function removeTokenAt(
  value: string,
  caret: number,
  dir: 'back' | 'forward',
  pattern?: RegExp,
): TokenEdit | null {
  const span = tokenSpans(value, pattern).find(([a, b]) =>
    dir === 'back' ? b === caret : a === caret,
  );
  if (!span) return null;
  return { value: value.slice(0, span[0]) + value.slice(span[1]), caret: span[0] };
}

/** An arrow key beside a token moves past all of it; else null. */
export function stepOver(
  value: string,
  caret: number,
  dir: 'back' | 'forward',
  pattern?: RegExp,
): number | null {
  const span = tokenSpans(value, pattern).find(([a, b]) =>
    dir === 'back' ? b === caret : a === caret,
  );
  return span ? (dir === 'back' ? span[0] : span[1]) : null;
}

/** A caret can't sit inside a token: one that lands there moves to the token's end. */
export function snapOutOfToken(value: string, caret: number, pattern?: RegExp): number {
  const span = tokenSpans(value, pattern).find(([a, b]) => caret > a && caret < b);
  return span ? span[1] : caret;
}

/** The chip text for a token: the bracketed name, trimmed. */
export function defaultTokenLabel(token: string): string {
  return token.replace(/^\[|\]$/g, '').trim();
}
