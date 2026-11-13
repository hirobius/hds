/**
 * @hirobius/design-system/button
 *
 * Button on its own subpath (hds#1502), so an app with a tight entry budget
 * can import it without the root barrel. The root still exports Button; this
 * entry re-exports the same module, so both imports give the same component.
 */
export * from './app/components/button';
