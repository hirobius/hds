#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/hooks/check-pr-body.mjs
 *
 * Claude Code PreToolUse hook. Blocks (exit 2, one stderr line) opening or
 * re-bodying a PR whose body lacks the `/pr` skill shape (## Summary,
 * ## Evidence, ## Merge Danger) or a `Reviewed:` line recording that
 * /code-review ran. Ported from ops#503.
 *
 * Handles: mcp__github__create_pull_request, mcp__github__update_pull_request
 * (only when tool_input.body is present), and Bash `gh pr create` (--body/-b
 * value or --body-file/-F path; unextractable, e.g. "$VAR" -> allow with a
 * stderr note; --web and body-less --fill* -> blocked like an empty body).
 * Fail-soft: any internal error or bad stdin exits 0.
 *
 * Self-test: pnpm test scripts/__tests__/check-pr-body.test.mjs
 */

import { readFileSync } from 'node:fs';

const HEADINGS = ['## Summary', '## Evidence', '## Merge Danger'];

export function checkPrBody(body) {
  const text = typeof body === 'string' ? body : '';
  const missing = HEADINGS.filter((h) => !new RegExp(`^\\s{0,3}${h}\\s*$`, 'im').test(text));
  if (!/^Reviewed:/m.test(text)) missing.push('Reviewed: line');
  return { ok: missing.length === 0, missing };
}

// Pull the body out of a `gh pr create` command line. Returns a string, or
// null when it cannot be determined.
export function extractBashBody(command) {
  const read = (p) => {
    try {
      return readFileSync(p, 'utf8');
    } catch {
      return null;
    }
  };
  const file = command.match(/(?:^|\s)(?:--body-file|-F)(?:\s+|=)("([^"]+)"|'([^']+)'|(\S+))/);
  if (file) return read(file[2] ?? file[3] ?? file[4]);

  const flag = command.match(/(?:^|\s)(?:--body|-b)(?:\s+|=)/);
  if (!flag) return null;
  const rest = command.slice(flag.index + flag[0].length);
  const unexpandable = (v) => /\$|`/.test(v);
  // $(cat <<'EOF' ... EOF ) heredoc
  const heredoc = rest.match(/^"?\$\(cat\s+<<-?\s*['"]?(\w+)['"]?\n([\s\S]*?)\n\s*\1\b/);
  if (heredoc) return heredoc[2];
  const q = rest[0];
  if (q === '"' || q === "'") {
    const end = rest.indexOf(q, 1);
    if (end === -1) return null;
    const v = rest.slice(1, end);
    return q === '"' && unexpandable(v) ? null : v;
  }
  const bare = rest.match(/^\S+/);
  return bare && !unexpandable(bare[0]) ? bare[0] : null;
}

function evaluate(payload) {
  const tool = payload?.tool_name;
  const input = payload?.tool_input ?? {};
  let body;
  if (tool === 'mcp__github__create_pull_request') {
    body = input.body ?? '';
  } else if (tool === 'mcp__github__update_pull_request') {
    if (typeof input.body !== 'string') return { ok: true };
    body = input.body;
  } else if (tool === 'Bash' && /\bgh\s+pr\s+create\b/.test(input.command ?? '')) {
    const cmd = input.command;
    body = extractBashBody(cmd);
    // --web and body-less --fill skip the body entirely: same reason as an empty body.
    if (
      /(?:^|\s)--web\b/.test(cmd) ||
      (body === null && /(?:^|\s)--fill(?:-first|-verbose)?(?:\s|$)/.test(cmd))
    ) {
      return checkPrBody('');
    }
    if (body === null) {
      return {
        ok: true,
        note: 'check-pr-body: could not extract PR body from gh command; not checked',
      };
    }
  } else {
    return { ok: true };
  }
  return checkPrBody(body);
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  const r = evaluate(payload);
  if (r.note) process.stderr.write(r.note + '\n');
  if (r.ok) return 0;
  process.stderr.write(
    `PR body missing: ${r.missing.join(', ')}. Use the pr skill shape and run /code-review, then add "Reviewed: ..."\n`,
  );
  return 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let code = 0;
  try {
    code = main();
  } catch {
    code = 0;
  }
  process.exit(code);
}
