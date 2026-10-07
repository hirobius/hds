import { PREVIEWED_COMPONENTS, type PreviewedComponent } from '../lib/previewed-components';
import { ComponentDemo } from './component-demo-client';

/**
 * `{/* preview: Name *\/}` marker target. Renders the live demo for the named
 * component, or says plainly that none exists yet (no broken or invented demo).
 */
export function ComponentPreview({ name }: { name: string }) {
  if (!(PREVIEWED_COMPONENTS as readonly string[]).includes(name)) {
    return (
      <p className="hds-preview-missing">
        No live preview for <code>{name}</code> yet.
      </p>
    );
  }
  return <ComponentDemo name={name as PreviewedComponent} />;
}
