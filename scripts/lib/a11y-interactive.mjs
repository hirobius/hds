/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * a11y-interactive.mjs — which components owe an accessibility contract (hds#520).
 *
 * check-a11y-contracts reads these lists. A component is one of:
 *   INTERACTIVE  a root that owns operable elements; needs `a11yRules` (@a11y tags).
 *   PARTS        a compound part, covered by its root's rules.
 *   COMPOSITE    interactive-category but owns nothing operable itself (exempt), or
 *                explicitly out of scope on hds#520 (EmptyState, Pin, Sidebar).
 *
 * A new component in Overlays, Inputs, Navigation or Actions that is in none of
 * the three fails the gate (the category tripwire): add it here on purpose.
 */

export const INTERACTIVE = Object.freeze([
  'Dialog',
  'AlertDialog',
  'Sheet',
  'Popover',
  'Menu',
  'Tooltip',
  'ToastProvider',
  'Select',
  'Combobox',
  'DestructiveSection',
  'Table',
  'Checkbox',
  'Radio',
  'Toggle',
  'Slider',
  'SegmentedControl',
  'Tag',
  'Input',
  'Textarea',
  'TokenField',
  'Form',
  'FormField',
  'FormFieldShell',
  'Button',
  'InlineLink',
  'Breadcrumb',
  'NavList',
  'Pagination',
  'Tabs',
  'Disclosure',
  'Card',
  'AssetImg',
  'CodeBlock',
  'InlineCode',
  'Composer',
  'CommandPalette',
  'ThemeToggle',
]);

/** Compound part (or flat alias) to the root whose rules cover it. */
export const PARTS = Object.freeze({
  DialogTrigger: 'Dialog',
  DialogPortal: 'Dialog',
  DialogOverlay: 'Dialog',
  DialogContent: 'Dialog',
  DialogHeader: 'Dialog',
  DialogBody: 'Dialog',
  DialogFooter: 'Dialog',
  DialogTitle: 'Dialog',
  DialogDescription: 'Dialog',
  DialogClose: 'Dialog',
  SheetTrigger: 'Sheet',
  SheetContent: 'Sheet',
  SheetHeader: 'Sheet',
  SheetFooter: 'Sheet',
  SheetTitle: 'Sheet',
  SheetDescription: 'Sheet',
  SheetActions: 'Sheet',
  SheetAction: 'Sheet',
  SheetClose: 'Sheet',
  NavListItem: 'NavList',
  TabsList: 'Tabs',
  TabsTrigger: 'Tabs',
  TabsContent: 'Tabs',
});

export const COMPOSITE = Object.freeze([
  'FormActions',
  'DataTableSection',
  'PageHeader',
  'EmptyState',
  'Pin',
  'Sidebar',
]);

/** Categories whose members must be classified above (the category tripwire). */
export const GOVERNED_CATEGORIES = Object.freeze(['Overlays', 'Inputs', 'Navigation', 'Actions']);
