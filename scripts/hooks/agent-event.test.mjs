// Wiring check for the shared agent-event hook (hirobius/ops#590).
// Run: node --test scripts/hooks/agent-event.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settings = JSON.parse(readFileSync(new URL('../../.claude/settings.json', import.meta.url), 'utf8'));

for (const ev of ['SessionStart', 'UserPromptSubmit', 'Notification', 'Stop', 'SessionEnd']) {
  test(`${ev} runs agent-event.mjs`, () => {
    const cmds = (settings.hooks?.[ev] ?? []).flatMap((g) => g.hooks.map((h) => h.command));
    assert.ok(cmds.some((c) => c.includes('scripts/hooks/agent-event.mjs')), `${ev} not wired`);
  });
}

test('payload builder maps events', async () => {
  const { buildPayload } = await import('./agent-event.mjs');
  const p = buildPayload({ hook_event_name: 'Notification', message: 'needs input' },
    { CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_x' }, { repo: 'hirobius/x', branch: 'b' });
  assert.deepEqual(p, { sessionId: 'session_x', event: 'waiting', title: 'b', repo: 'hirobius/x',
    url: 'https://claude.ai/code/session_x', note: 'needs input' });
  assert.equal(buildPayload({ hook_event_name: 'PreToolUse' }, {}, { repo: '', branch: '' }), null);
});
