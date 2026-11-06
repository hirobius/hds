/**
 * CLI plumbing the release:* scripts share (hds#1009 dedupe): --help and usage
 * errors, and "run main() when this file is the entry point".
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Parse argv; print usage for --help (exit 0) or a usage error (exit 2).
 * @returns {{ exit: number } | { options: object }}
 */
export function readArgs(argv, parseArgs, usage) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    console.log(usage);
    return { exit: 0 };
  }
  if (parsed.error) {
    console.error(`${parsed.error}\n\n${usage}`);
    return { exit: 2 };
  }
  return { options: parsed.options };
}

/** Run `main(argv)` and set the exit code when `moduleUrl` is the entry point. */
export async function runIfEntry(moduleUrl, main) {
  if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(moduleUrl)) {
    process.exitCode = await main(process.argv.slice(2));
  }
}
