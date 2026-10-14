import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expandRepoDoc } from './repo-doc';
import { findUp } from './site-data';

/**
 * Remark plugin behind <RepoDoc path="…" /> (see repo-doc.ts). Runs first, so
 * the spliced doc gets heading ids, the contents rail and search like any page.
 * The doc is parsed with this page's own processor and registered as a build
 * dependency, so editing it rebuilds the page.
 */
/** The slice of a unified processor and vfile this plugin uses. */
interface Parser {
  parse(source: string): unknown;
}
interface File {
  data: { _compiler?: { addDependency(path: string): void } };
}

export function remarkRepoDoc(this: Parser) {
  const processor = this;
  const root = dirname(dirname(findUp('figma/links.json')));
  const links = JSON.parse(readFileSync(join(root, 'figma/links.json'), 'utf8')) as {
    repository: string;
    branch: string;
  };
  const blobBase = `${links.repository}/blob/${links.branch}`;
  return (tree: never, file: File) => {
    const compiler = file.data._compiler;
    expandRepoDoc(tree, {
      blobBase,
      read: (p) => {
        const abs = join(root, p);
        compiler?.addDependency(abs);
        return readFileSync(abs, 'utf8');
      },
      parse: (source) => processor.parse(source) as never,
    });
  };
}
