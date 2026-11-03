/**
 * Lines of `text` that mention a removed name without saying 0.20.0 removed
 * it, as `file:line: name`. Shared by the removed-names doc guards, hds#1011.
 */
export function staleMentions(
  file: string,
  text: string,
  names: readonly string[],
  mention: (name: string) => RegExp,
): string[] {
  return text
    .split('\n')
    .flatMap((line, i) =>
      names
        .filter((name) => mention(name).test(line) && !line.includes('0.20.0'))
        .map((name) => `${file}:${i + 1}: ${name}`),
    );
}
