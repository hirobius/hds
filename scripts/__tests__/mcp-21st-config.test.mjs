/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The 21st MCP wiring for hds sessions (hirobius/hds#628, phase 0).
 *
 * Magic is now the 21st MCP: an HTTP endpoint authenticated with an x-api-key
 * header. Two things must hold for any session in this repo:
 *
 *   1. The key never lands in a file. `.mcp.json` names the environment
 *      variable and Claude Code expands it at connect time.
 *   2. Every 21st tool that changes the account or spends money is denied in
 *      `.claude/settings.json`. The endpoint exposes a hard delete
 *      (`delete_template`) next to the read-only search tools, so the deny list
 *      is the only thing between a session and Adrian's account.
 *
 * The tool names come from the endpoint's own `tools/list` (51 tools on
 * 2026-10-12). Read-only ones (search, get_inspiration, get_theme, get_component
 * and the list/get family) stay allowed.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const mcpConfig = () => readJson('.mcp.json');
const settings = () => readJson('.claude/settings.json');

const ACCOUNT_CHANGING = [
  'delete_component',
  'delete_theme',
  'delete_template',
  'edit_component',
  'edit_theme',
  'edit_template',
  'edit_profile',
  'upload_profile_media',
  'submit_component',
  'withdraw_component',
  'resubmit_component',
  'remove_component_from_catalog',
  'bookmark',
  'create_bookmark_list',
  'add_to_list',
  'send_feedback',
  'record_take_outcome',
  'update_note',
  'edit_take',
  // not in the spec's list, but it writes to the account the same way as
  // record_take_outcome: it records an accept or reject against get_inspiration
  'record_inspiration_feedback',
];

// Every video_* tool the endpoint listed; the read-only ones are denied too (the spec says all).
const VIDEO_TOOLS = [
  'video_list_blocks',
  'video_search_blocks',
  'video_create_project',
  'video_get_doc',
  'video_apply_ops',
  'video_propose_variants',
  'video_upload_asset',
  'video_finalize_asset',
  'video_snapshot',
  'video_export',
  'video_export_status',
];

const READ_ONLY_KEPT = ['search', 'get_inspiration', 'get_theme', 'get_component'];

describe('.mcp.json: the 21st server', () => {
  it('declares an HTTP server named "21st" at the 21st endpoint', () => {
    const server = mcpConfig().mcpServers['21st'];
    expect(server).toBeDefined();
    expect(server.type).toBe('http');
    expect(server.url).toBe('https://21st.dev/api/mcp');
  });

  it('takes the x-api-key from API_KEY_21ST by variable expansion', () => {
    const { headers } = mcpConfig().mcpServers['21st'];
    expect(headers['x-api-key']).toBe('${API_KEY_21ST}');
  });

  it('writes no literal key anywhere in the file', () => {
    const raw = readFileSync(path.join(ROOT, '.mcp.json'), 'utf8');
    // the only ${...} in the file is the expansion; no long token-looking string is present
    expect(raw.match(/\$\{[^}]+\}/g)).toEqual(['${API_KEY_21ST}']);
    expect(raw).not.toMatch(/[A-Za-z0-9_-]{32,}/);
  });
});

describe('.claude/settings.json: the 21st deny list', () => {
  const deny = () => settings().permissions.deny;

  it.each([...ACCOUNT_CHANGING, ...VIDEO_TOOLS])('denies mcp__21st__%s', (tool) => {
    expect(deny()).toContain(`mcp__21st__${tool}`);
  });

  it.each(READ_ONLY_KEPT)('keeps the read-only %s tool available', (tool) => {
    expect(deny()).not.toContain(`mcp__21st__${tool}`);
    expect(deny()).not.toContain('mcp__21st');
    expect(deny()).not.toContain('mcp__21st__*');
  });

  it('keeps every deny entry the file had before', () => {
    for (const entry of [
      'mcp__Gmail',
      'mcp__Google_Calendar',
      'mcp__Google_Drive',
      'mcp__Wix',
      'mcp__Excalidraw',
      'mcp__Claude_Docs',
      'mcp__Supabase',
    ]) {
      expect(deny()).toContain(entry);
    }
  });

  it('lists nothing twice', () => {
    expect(new Set(deny()).size).toBe(deny().length);
  });

  it('keeps the hooks and skill overrides the file had before', () => {
    const s = settings();
    expect(Object.keys(s.hooks).sort()).toEqual(
      ['PostToolUse', 'PreToolUse', 'SessionStart', 'UserPromptSubmit'].sort(),
    );
    expect(s.skillOverrides['keybindings-help']).toBe('off');
  });
});
