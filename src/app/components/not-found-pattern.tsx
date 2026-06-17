/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * NotFoundPattern - governed not-found recovery surface for unroutable pages.
 * @category Feedback
 * @tier utility
 * @doc-exempt: zero-prop wrapper around ErrorPattern; LLMs should target ErrorPattern directly
 */
import { ErrorPattern } from './error-pattern';

export function NotFoundPattern() {
  return <ErrorPattern displayText="404" message="Page not found" />;
}
