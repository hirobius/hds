# Upgrading @hirobius/design-system

This file only knows the releases up to the version you have installed, 0.21.0. For newer releases, read the newest copy at https://github.com/hirobius/hds/blob/main/UPGRADING.md. From 0.22.0, `npx @hirobius/design-system@latest upgrade` fetches the newest steps and applies them for you.

## How to upgrade

1. Install the exact version: `pnpm add @hirobius/design-system@0.21.0`. `pnpm update` never crosses a 0.x minor.
2. For each release you cross, run the codemods listed under Fixed for you.
3. Then work through its Do by hand list.

This file covers every release after 0.16.0. From an older version, follow MIGRATIONS.md up to 0.16.0 first.

## 0.21.0

Released 2026-10-07 (minor). StatusDot is removed, fonts move to an opt-in fonts.css, the type ramp is cut to 5 roles; AGENTS.md, hds-mcp and the ESLint plugin ship.

### Looks different

- AssetImg without a src now shows a fallback that fits its container.
- A pressed toggle Button now fills with the accent surface, so it reads as on.
- Card, Surface and StatusTile no longer fill their parent's height, so give the parent a stretching layout (Grid align="stretch") where one must fill it.
- CodeBlock pads its code 16px instead of 80px.
- Dialog and AlertDialog now keep a 16px margin from the screen edge and scroll inside when taller than the screen.
- Disclosure variant="card" no longer clips its content or leaves empty space when closed.
- A vertical Divider now stretches across its row without needing a parent height.
- ErrorPattern now fits its container instead of filling the viewport height, so pass fullPage where it is a whole error page.
- A Button with no variant in FormActions primary now renders as primary, so pass variant where you want another style there.
- Grid now aligns its items to the start and Grid.Item no longer sets height: 100%, so pass align="stretch" to a Grid whose Cards, Surfaces or StatusTiles must share one height.
- A horizontal MetadataList now sizes its term column to its content.
- Progress now shows its neutral fill on a visible track, and its sm bar is 6px tall.
- SegmentedControl md segments now hug their labels in a 40px rail (sm 32px), so every segment shows instead of one filling the rail.
- Select now matches Input (40px tall, 44px on small screens, the same fill and an up-down chevron), and the built-in labels of Input, Textarea and Select are 14px like a FormField label.
- A rectangular Skeleton is now 5rem tall by default and uses the sunken surface fill, so it shows on a Card.
- Slider's track is now an 8px bar with a visible fill instead of a padded 48px slab.
- Stat now aligns its content to the start.
- Table no longer pads its scroll region by default, so pass flush={false} where you want the old inset back.
- Checkbox, Radio and Toggle rows now share one inset and height.
- Input, Textarea, Select, Combobox and Slider are now at most 40rem wide, so set --hds-form-control-max-width or add max-w-none to the control's className where one must be wider.
- On touch screens, Checkbox, Radio and Toggle rows, the Pagination page buttons and the CodeBlock copy button are now at least 44px tall.
- Headings (h1 to h3, heading1 to heading3) now render at 24px, display at 48px, body at 16px with 1.6 leading and mono at 13px, and eyebrow, badge and micro text is no longer uppercase.

### Coming next

- The Text variants heading1, heading2, heading3, technical, eyebrow, badge, docLede, docBody, docSmall and docCode still work but are deprecated; use title, mono, caption, body or ui instead. Removed in 1.0.0.
- The hds.typeStyles keys from before the ramp (h1 to h3, heading1 to heading3, eyebrow, badge, micro, technical, small, label and the rest) and hds.semantic.typography label, labelDescriptive and labelTechnical still work but are deprecated; use display, title, body, ui, caption or mono instead. Removed in 1.0.0.

### Do by hand

- StatusDot and StatusDotProps are removed, so replace each \<StatusDot tone size label> with \<Badge dot tone size label> (BadgeProps for the type), moving any style to a wrapper element or a className first.
- The HDS ESLint plugin's recommended config now fails raw \<button>, \<input>, \<select>, \<textarea> and \<form> (hds/no-raw-controls), so use Button, Input, Select, Textarea and Form instead or set the rule to 'off'.
- An info or success Alert now has role="status" instead of role="alert", so tests that find it by role must look for status.
- A labelled dot Badge now has role="img" instead of role="status", so tests that find it by role must look for img.
- A className on Button or Card can now override the colours a tone sets, so check any toned Button or Card that also passes colour classes.
- Combobox now returns focus to its trigger after Escape or a pick.
- Toggle's input now has role="switch", so tests that find it by role checkbox must look for switch.
- Checkbox, Radio and Toggle now take one tab stop each instead of two, so keyboard tests that press Tab twice per control must press it once.
- The CSS variable --semantic-typography-eyebrow-text-transform is gone, so set text-transform: uppercase yourself where a label must stay uppercase.
- Add import '@hirobius/design-system/fonts.css' next to your tokens.css or styles.css import, or text renders in the system font instead of Satoshi and Geist Mono.
- The ESLint plugin now ships in the package, so import hds from '@hirobius/design-system/eslint-plugin' and drop the separate @hirobius/eslint-plugin-hds dependency.
- A Badge with label but no dot now warns once in development, because label only names a dot badge, so put the text in children instead.

## 0.20.0

Released 2026-10-01 (minor). Pattern components move to /patterns; deprecated, lab and folded components, Hds\* aliases and 7 runtime deps are removed.

### Fixed for you

Run each codemod once from your project root:

```sh
npx -p @hirobius/design-system@0.21.0 hds-not-found-pattern --root .
npx -p @hirobius/design-system@0.21.0 hds-patterns-subpath --root .
npx -p @hirobius/design-system@0.21.0 hds-prefix --root .
npx -p @hirobius/design-system@0.21.0 hds-tile-grid --root .
```

- AssetImg is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- AssetImgProps is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- CodeBlock is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- CodeBlockProps is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- ErrorPattern is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- ErrorPatternProps is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- FieldWiring is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- FieldWiringInput is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- Form is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- FormField is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- FormFieldProps is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- FormFieldShell is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- FormFieldShellProps is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- FormProps is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- Page is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- PageProps is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- Reveal is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- RevealAnimation is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- RevealProps is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- StatusTile is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- StatusTileProps is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- StatusTileTone is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- blockCodeTextVariants is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- blockContainerVariants is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- blockHeaderVariants is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- chevronVariants is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- collapsibleToggleVariants is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- copyButtonVariants is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- inlineCodeTextVariants is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- inlineWrapperVariants is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- prePanelVariants is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- useFieldWiring is no longer exported from the package root; import it from @hirobius/design-system/patterns instead. Codemod: `hds-patterns-subpath`.
- HdsCheckbox is removed from the package root; use Checkbox, the same component under its bare name. Codemod: `hds-prefix`.
- HdsRadio is removed from the package root; use Radio, the same component under its bare name. Codemod: `hds-prefix`.
- HdsSelect is removed from the package root; use Select, the same component under its bare name. Codemod: `hds-prefix`.
- HdsSlider is removed from the package root; use Slider, the same component under its bare name. Codemod: `hds-prefix`.
- HdsToggle is removed from the package root; use Toggle, the same component under its bare name. Codemod: `hds-prefix`.
- HdsTooltip is removed from the package root; use Tooltip, the same component under its bare name. Codemod: `hds-prefix`.
- NotFoundPattern is removed; use ErrorPattern displayText="404" message="Page not found" from @hirobius/design-system/patterns (hds-not-found-pattern rewrites it) instead. Codemod: `hds-not-found-pattern`.
- TileGrid is removed; use Grid layout="auto-fill" minItemWidth="…" gap="medium" (hds-tile-grid rewrites it) instead. Codemod: `hds-tile-grid`.

### Looks different

- AssetImg's expand label now uses the on-accent text color, so it stays readable in dark mode.
- Box sx spacing given as a t-shirt name such as 'md' now applies that spacing, where before it applied none.
- A pressed Button now tints only its fill with a 5% overlay, white in dark mode, instead of dimming the whole control, and the press no longer animates.
- Input keeps its inner padding beside icons, the clear button and the spinner, so long text no longer runs under them.
- A string passed to Input's prefix prop now shows as text inside the field, where before it went to the input element as an attribute.
- A sortable Table header now fades its label to the muted color on hover.
- Tooltip now casts the floating shadow that popovers and menus use instead of the dialog shadow.

### Coming next

- Box sx spacing names 'tight', 'normal', 'inset' and 'spacious' still work but are deprecated, and a development build warns once for each; use 'sm' to 'xl' instead. Removed in 1.0.0.
- Stack gap names 'tight', 'normal', 'inset' and 'spacious' still work and do not warn yet, but are removed in 1.0.0, and Stack names no replacement until then. Removed in 1.0.0.
- hds.density still works but is deprecated; use hds.semantic.space.scale one step down, so density.sm becomes scale.xs. Removed in 1.0.0.
- Sixteen Tailwind utilities that only HDS's deleted internal files used, such as pt-1 and max-w-2xl, still ship in styles.css and tokens.css until 1.0.0, so a page that relies on HDS's compiled CSS for them should generate them with its own Tailwind. Removed in 1.0.0.

### Do by hand

- ActivityEvent is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- ActivityFeed is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- ActivityFeedProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- ActivityStatus is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- ActivityTone is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- AppShell is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- AppShellProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- ButtonGroup is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- ButtonGroupProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- Calendar is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- CalendarProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- Carousel is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- CarouselProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- CaseStudyLayout is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- CaseStudyLayoutProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- CinematicLink is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- CinematicLinkProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- CommandPalette is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- CommandPaletteProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- ComponentInstanceMatrix is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- ContextMenu is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- DateInput is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- DateInputProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- DateRangeInput is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- DateRangeInputProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- DateTimeInput is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- DateTimeInputProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- DocLinkCard is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- DocLinkCardProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- ErrorBoundary is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- ErrorBoundaryProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- FileInput is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- FileInputProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- FoundationSwatch is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- FoundationSwatchProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- HdsDocsShell is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- HdsDocsShellProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- HdsSystemDocLayout is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- HeadingStack is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- HeadingStackProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- HistoryCard is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- HistoryCardCommit is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- HistoryCardProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- HoverCard is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- Lightbox is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- LightboxProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- NavGroup is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- NavGroupProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- NavItem is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- NavProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- OverflowList is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- OverflowListProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- SideNav is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- SideNavLevel is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- SideNavProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- Sketch is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- SketchProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- StackedCardRail is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- StackedCardRailCard is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- StackedCardRailProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- Step is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- Stepper is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- StepperField is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- StepperFieldProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- StepperProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- TextLockup is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- TextLockupProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- Token is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- TokenProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- Tokenizer is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- TokenizerProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- Toolbar is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- ToolbarComponent is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- TopNav is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- TopNavProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- TreeList is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- TreeListProps is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- TreeNode is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- activityAvatarVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- activityToneVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- appShellVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- badgeVariants is no longer exported, so style its component through the component's props instead.
- blockquoteVariants is no longer exported, so style its component through the component's props instead.
- buttonGroupVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- buttonVariants is no longer exported, so style its component through the component's props instead.
- cardVariants is no longer exported, so style its component through the component's props instead.
- carouselControlVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- circularProgressVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- cmdkDescriptionVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- cmdkKindBadgeVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- cmdkRowVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- crumbLabelVariants is no longer exported, so style its component through the component's props instead.
- defaultActivityEvents is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- disclosureTriggerVariants is no longer exported, so style its component through the component's props instead.
- docLinkCardVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- fieldValueVariants is no longer exported, so style its component through the component's props instead.
- fileInputVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- hdsTimeInputVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- hdsToggleButtonVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- headingStackLevelVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- headingStackVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- inlineCodeVariants is no longer exported, so style its component through the component's props instead.
- inputVariants is no longer exported, so style its component through the component's props instead.
- kbdVariants is no longer exported, so style its component through the component's props instead.
- metadataListVariants is no longer exported, so style its component through the component's props instead.
- navGroupLabelVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- navIndicatorVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- navItemVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- overflowBubbleVariants is no longer exported, so style its component through the component's props instead.
- progressTrackVariants is no longer exported, so style its component through the component's props instead.
- segmentedControlDescriptionVariants is no longer exported, so style its component through the component's props instead.
- segmentedControlFocusRingVariants is no longer exported, so style its component through the component's props instead.
- segmentedControlIndicatorVariants is no longer exported, so style its component through the component's props instead.
- segmentedControlItemVariants is no longer exported, so style its component through the component's props instead.
- segmentedControlLabelVariants is no longer exported, so style its component through the component's props instead.
- segmentedControlRailVariants is no longer exported, so style its component through the component's props instead.
- segmentedControlWrapperVariants is no longer exported, so style its component through the component's props instead.
- selectableCardVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- sideNavVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- skeletonVariants is no longer exported, so style its component through the component's props instead.
- spinnerVariants is no longer exported, so style its component through the component's props instead.
- statVariants is no longer exported, so style its component through the component's props instead.
- statusDotVariants is no longer exported, so style its component through the component's props instead.
- statusListItemDotVariants is no longer exported, so style its component through the component's props instead.
- stepMarkerVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- surfaceVariants is no longer exported, so style its component through the component's props instead.
- tableDataCellVariants is no longer exported, so style its component through the component's props instead.
- tableHeaderCellVariants is no longer exported, so style its component through the component's props instead.
- tableSortButtonVariants is no longer exported, so style its component through the component's props instead.
- tagButtonVariants is no longer exported, so style its component through the component's props instead.
- tagPillVariants is no longer exported, so style its component through the component's props instead.
- textVariants is no longer exported, so style its component through the component's props instead.
- textareaVariants is no longer exported, so style its component through the component's props instead.
- toastIconVariants is no longer exported, so style its component through the component's props instead.
- tokenLabelVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- tokenNodeInlineVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- tokenShellVariants is removed with no drop-in replacement, so rewrite or delete the code that imports it.
- AspectRatio is removed; use Box style={{ aspectRatio: '16 / 9' }} instead.
- AspectRatioProps is removed; use BoxProps instead.
- Bleed is removed; use Box style={{ marginInline: 'calc(-1 \* var(--semantic-space-scale-md))' }} instead.
- BleedProps is removed; use BoxProps instead.
- Center is removed; use Container maxWidth="content", with a Box style={{ paddingInline }} inside for the gutter instead.
- CenterProps is removed; use ContainerProps instead.
- CircularProgress is removed; use Progress variant="circular" instead.
- CircularProgressProps is removed; use ProgressProps instead.
- Cluster is removed; use Stack direction="row" wrap="wrap" align="center" instead.
- ClusterProps is removed; use StackProps instead.
- Cover is removed; use Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }} around a Box style={{ marginBlock: 'auto' }} instead.
- CoverProps is removed; use BoxProps instead.
- Frame is removed; use Box style={{ aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: hds.borderRadius.md }} instead.
- FrameProps is removed; use BoxProps instead.
- IconButton is removed; use Button iconOnly label="…" iconLeft={\<Icon icon={…} />} instead.
- IconButtonProps is removed; use ButtonProps instead.
- InputGroup is removed; use Input prefix / suffix instead.
- InputGroupProps is removed; use InputProps instead.
- MultiSelector is removed; use Combobox multiple instead.
- MultiSelectorOption is removed; use ComboboxOption instead.
- MultiSelectorProps is removed; use ComboboxMultipleProps instead.
- SelectableCard is removed; use Card selectable selected onSelectedChange instead.
- SelectableCardProps is removed; use CardProps instead.
- TileGridProps is removed; use GridProps (minTileWidth is minItemWidth, gap 'sm' is 'medium') instead.
- TimeInput is removed; use Input type="time" instead.
- TimeInputProps is removed; use InputProps instead.
- ToggleButton is removed; use Button pressed onPressedChange (variant="ghost" is variant="tertiary") instead.
- ToggleButtonProps is removed; use ButtonProps instead.
- HDS no longer installs @radix-ui/react-aspect-ratio, so add it to your own dependencies if your code imports it.
- HDS no longer installs @radix-ui/react-context-menu, so add it to your own dependencies if your code imports it.
- HDS no longer installs @radix-ui/react-hover-card, so add it to your own dependencies if your code imports it.
- HDS no longer installs @radix-ui/react-toggle, so add it to your own dependencies if your code imports it.
- HDS no longer installs @radix-ui/react-toolbar, so add it to your own dependencies if your code imports it.
- HDS no longer installs date-fns, so add it to your own dependencies if your code imports it.
- HDS no longer installs react-day-picker, so add it to your own dependencies if your code imports it.
- An icon-only Button now takes its accessible name from label, unless it has an aria-label.
- Card selectable, which replaces SelectableCard, toggles on click or Space only, so code or tests that press Enter to toggle it must press Space instead.
- Combobox options now report their real position, and a Select with showLabel={false} is named by its label and value, so tests that find them by role and name may need updating.
- The open Select list and the Combobox popup now carry an accessible name, so tests that find them by role and name may need the new name.
- The manifest no longer has a health field, so manifest.health is now undefined.
- The rows inside PageHeader, FormActions, DataTableSection and DestructiveSection now carry data-hds-component="Stack" instead of "Cluster", so selectors and tests that look for Cluster there must change.

## 0.19.1

Released 2026-09-30 (patch). Smaller Button-only bundles for webpack and esbuild, and Storybook accessibility fixes; nothing for a consumer to change.

Nothing in this release asks anything of you.

## 0.19.0

Released 2026-09-30 (minor). Overlays portal into the nearest data-hds scope, compact density tightens spacing, containers share one radius; adds /icons.

### Looks different

- A Table with no density prop now follows the nearest data-density attribute, so a Table inside a compact region renders compact unless you pass density.
- Under compact density (data-density="compact", which HdsThemeProvider density="compact" and ThemeProvider's setDensity also set) the spacing scale, surface padding and region gutter that components read now tighten, so compact screens render visibly tighter than before.
- Surface, StatusTile, DocLinkCard, static.css's .hds-card and the .hds-soft-nav-card and .hds-sketchbook-canvas-stage classes now round to the tenant's container radius, 12px by default, instead of a fixed 8px.
- The dark theme (data-theme="dark" or the dark class, which HdsThemeProvider theme="dark" and ThemeProvider set) now declares color-scheme: dark, so native scrollbars and form controls inside it render dark.
- The scrim behind an open Dialog, AlertDialog or CommandPalette is now the theme-aware scrim color, black in dark mode where it was a white wash.

### Do by hand

- In development, a Button with iconOnly and no iconLeft now logs one warning, so a test that fails on console warnings will flag it.
- Overlays mount in the nearest data-hds element, not document.body, and take its theme, so check CSS or tests that query body: Dialog, AlertDialog, Menu, ContextMenu, Popover, Select, HoverCard, Tooltip, Lightbox, AssetImg, and the overlays of Combobox, MultiSelector, CommandPalette and date inputs.

## 0.18.0

Released 2026-09-30 (minor). Adds the hds-patterns-subpath codemod, which moves root imports of the deprecated pattern components to /patterns.

Nothing in this release asks anything of you.

## 0.17.0

Released 2026-09-30 (minor). Adds /patterns and the standard type ramp; root pattern imports, Hds\* names and seven spacing tokens are deprecated.

### Looks different

- Badge text grows from 11px to 12px, CommandPalette's kind badges, shortcuts and footer from 10px to 12px, and SegmentedControl labels shrink from 15px to 14px on a 20px line, now that they use the ramp's text-xs and text-sm.
- Calendar's days outside the shown month are no longer drawn at half opacity, so they read darker.
- A disabled Tokenizer shows muted text instead of fading the whole field to 70% opacity.
- Second-level headings (Text and HeadingStack heading2, and any h2 inside HdsThemeProvider or another data-hds element) keep their 30px size, but their line height drops from 42px to 40px.
- Elements with the hds-focus class, which many HDS components use (Dialog, Select, Radio, Toggle and Slider among them), now show their focus ring on every keyboard focus, where before it showed only if the page set data-input-modality="keyboard" on html, which no HDS code did.
- The highlighted option in Menu, Select, Combobox and MultiSelector now also shows an inset ring in the focus color.
- Text follows Tailwind's default type ramp, so body text renders at 16px instead of 17px, UI and button text 1px smaller, captions and eyebrows at 12px instead of 13px, mono at 14px instead of 13px, display at 60px instead of 72px, and text-xs to text-6xl shrink to match.

### Coming next

- The spacing token semantic.space.component.gap (--semantic-space-component-gap) still works but is deprecated; use semantic.space.scale.xs, the same 8px at the default density. Removed in 1.0.0.
- The spacing token semantic.space.component.padding (--semantic-space-component-padding) still works but is deprecated; use semantic.space.surface.padding, which it now aliases. Removed in 1.0.0.
- The spacing token semantic.space.layout.gutter (--semantic-space-layout-gutter) still works but is deprecated; use semantic.space.region.gutter, which it now aliases. Removed in 1.0.0.
- The spacing token semantic.space.layout.inset (--semantic-space-layout-inset) still works but is deprecated; use semantic.space.scale.lg, the same 32px at the default density. Removed in 1.0.0.
- The spacing token semantic.space.layout.normal (--semantic-space-layout-normal) still works but is deprecated; use semantic.space.scale.md, the same 24px at the default density. Removed in 1.0.0.
- The spacing token semantic.space.layout.spacious (--semantic-space-layout-spacious) still works but is deprecated; use semantic.space.scale.xl, the same 48px at the default density. Removed in 1.0.0.
- The spacing token semantic.space.layout.tight (--semantic-space-layout-tight) still works but is deprecated; use semantic.space.scale.sm, the same 16px at the default density. Removed in 1.0.0.

### Do by hand

- AssetImg with alt text is now role img named by it, and one with neither alt nor onClick is hidden from assistive technology, so tests that find it by role or name may need updating.
- Card.Progress now carries an aria-label, its string label or "Progress", so tests that find it by role and name may need the new name.
- StepperField's label is now tied to its input, so the input is announced and found by its label text.
- Table now renders role table, row, columnheader and cell, wrapping each row in an element with display: contents, so selectors and tests that query its cells by role or by position in the DOM may need updating.
- OverflowList puts its +N item in a list item and names it with hidden text instead of aria-label, and MetadataList wraps its footer in a dt and dd pair, so tests that query that markup or the "+N more" label may need updating.
- Carousel's slide strip and StackedCardRail's scroll areas are now named regions that take keyboard focus, so each adds a Tab stop and tests that count Tab presses past them need one more.

<!-- Generated by scripts/upgrade/compile.mjs from upgrade/releases/*.json; do not edit. Run node scripts/upgrade/compile.mjs to regenerate. -->
