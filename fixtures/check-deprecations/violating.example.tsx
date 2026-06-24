// violating: one @deprecated prop has no @removeIn at all; another is past-due
// (@removeIn 0.1.0 <= the 1.0.0 fixture-mode compare version).
export interface ViolatingProps {
  /** @deprecated Use `tone` instead. */
  legacyColor?: string;
  /**
   * @deprecated Use `size` instead.
   * @removeIn 0.1.0
   */
  legacySize?: string;
}

export function ViolatingDeprecation(_props: ViolatingProps) {
  return null;
}
