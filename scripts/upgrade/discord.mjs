/**
 * The Discord step that release:announce and release:yank share (hds#1009
 * dedupe): print the lines, and post them to DISCORD_WEBHOOK_URL when applying.
 * The caller says how a failed post is counted (`onError`).
 */

/**
 * @param {{
 *   lines: string[], apply: boolean, log: (line: string) => void,
 *   env: Record<string, string|undefined>, fetch: typeof globalThis.fetch,
 *   onError: (error: Error) => void | Promise<void>,
 * }} opts
 */
export async function postDiscord({ lines, apply, log, env, fetch, onError }) {
  const hook = env.DISCORD_WEBHOOK_URL?.trim();
  if (!hook) {
    log('   skipped: set DISCORD_WEBHOOK_URL.');
    return;
  }
  for (const line of lines) log(`   ${apply ? '' : 'would post: '}${line}`);
  if (!apply) return;
  try {
    const res = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: lines.join('\n') }),
    });
    if (!res.ok) throw new Error(`Discord answered ${res.status}`);
  } catch (error) {
    await onError(error);
  }
}
