/**
 * Drops every GIT_* variable before each test file.
 *
 * A pre-push hook (above all one run from a worktree) exports GIT_DIR,
 * GIT_INDEX_FILE and friends. A test that runs git in a tmp fixture inherits
 * them, so its `git init` / `git commit` land in the real repo instead: junk
 * commits on the branch being pushed, and core.bare=true (#546). Child
 * processes inherit process.env, so clearing it here covers every test.
 */
export function stripGitEnv(env: Record<string, string | undefined>): void {
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
}

stripGitEnv(process.env);
