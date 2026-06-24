// passing: the @deprecated prop declares a future @removeIn version (> 1.0.0 in
// fixture mode), so it has a real removal plan.
export interface PassingProps {
  /**
   * @deprecated Use `tone` instead.
   * @removeIn 2.0.0
   */
  legacyColor?: string;
}

export function PassingDeprecation(_props: PassingProps) {
  return null;
}
