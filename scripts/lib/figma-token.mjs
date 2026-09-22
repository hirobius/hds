/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * figma-token.mjs — one place that knows what the Figma token is called.
 *
 * WHY THIS EXISTS. The repo asked for `FIGMA_ACCESS_TOKEN` and the environment
 * provides `FIGMA_API_KEY`. Nothing reconciled the two, so every authenticated
 * path reported "FIGMA_ACCESS_TOKEN is not set" while a perfectly good token
 * sat in the environment — which is the most likely reason ADR-025 still lists
 * dev resources on Pro as unverified: the call was never actually attempted.
 *
 * Both names are accepted. `FIGMA_ACCESS_TOKEN` wins when both are set, because
 * it is the one the docs and error messages name, so someone who sets it
 * deliberately to override an inherited `FIGMA_API_KEY` gets what they expect.
 */

/** Every environment variable that may carry a Figma personal access token. */
export const TOKEN_VARS = ['FIGMA_ACCESS_TOKEN', 'FIGMA_API_KEY'];

/**
 * The Figma token, or null when none is set.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string|null}
 */
export function figmaToken(env = process.env) {
  for (const name of TOKEN_VARS) {
    const value = env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/** Which variable supplied the token, for messages that should say so. */
export function figmaTokenSource(env = process.env) {
  for (const name of TOKEN_VARS) {
    const value = env[name];
    if (typeof value === 'string' && value.trim()) return name;
  }
  return null;
}

/**
 * The message to print when no token is set. Names both variables and the fix,
 * per the repo's rule that a secret-backed feature fails loud and actionable.
 *
 * @param {string} command the command the caller was running
 */
export function missingTokenMessage(command) {
  return (
    `No Figma token found. Set ${TOKEN_VARS.join(' or ')} — either is accepted. ` +
    'Create a personal access token at https://www.figma.com/settings ' +
    '(Security → Personal access tokens) with the scope the command needs ' +
    '(`file_content:read` to read a file, `file_dev_resources:write` to write dev resources), ' +
    `then re-run: FIGMA_ACCESS_TOKEN=<token> ${command}. ` +
    'In a remote session, set it in the environment config and start a NEW session — ' +
    'environment variables only load into a freshly started container.'
  );
}
