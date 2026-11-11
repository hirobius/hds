/**
 * @hirobius/design-system/sheet
 *
 * Sheet on its own subpath (hds#1433), so an app with a tight entry budget can
 * import it without the root barrel. The root still exports Sheet; this entry
 * re-exports the same module, so both imports give the same component.
 * It pulls in the Dialog parts (portal, overlay, title, description) and
 * OverlayClose that Sheet is built from.
 */
export * from './app/components/sheet';
