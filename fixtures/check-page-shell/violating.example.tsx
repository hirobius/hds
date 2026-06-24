// violating: a page imports raw HdsContainer instead of the Page shell, so it
// loses the canonical vertical padding.
import { HdsContainer } from '../../src/app/components/container';

export function ViolatingPageShell() {
  return <HdsContainer>content</HdsContainer>;
}
