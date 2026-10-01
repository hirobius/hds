import { ErrorPattern } from '@hirobius/design-system/patterns';

// NotFoundPattern in a comment is not an import: import { NotFoundPattern } from '@hirobius/design-system'
export default function NotFoundPage() {
  return <ErrorPattern displayText="404" message="Page not found" />;
}
