# Upgrading @hirobius/design-system

This file only knows the releases up to the version you have installed, 0.21.0. For newer releases, run `npx @hirobius/design-system@latest upgrade`: it always fetches the newest steps.

## How to upgrade

```sh
npx @hirobius/design-system@latest upgrade
```

It finds the version you have, moves you to the newest release, runs each release's codemods (Fixed for you) and lists what is left for you (Do by hand). It works from 0.16.0 on; from an older version, first reach 0.16.0 with the notes in CHANGELOG.md. MIGRATIONS.md has longer guides for the big releases.

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

The upgrade command runs these codemods for you.

- Each of these is no longer exported from the package root; import it from @hirobius/design-system/patterns instead: `AssetImg`, `AssetImgProps`, `CodeBlock`, `CodeBlockProps`, `ErrorPattern`, `ErrorPatternProps`, `FieldWiring`, `FieldWiringInput`, `Form`, `FormField`, `FormFieldProps`, `FormFieldShell`, `FormFieldShellProps`, `FormProps`, `Page`, `PageProps`, `Reveal`, `RevealAnimation`, `RevealProps`, `StatusTile`, `StatusTileProps`, `StatusTileTone`, `blockCodeTextVariants`, `blockContainerVariants`, `blockHeaderVariants`, `chevronVariants`, `collapsibleToggleVariants`, `copyButtonVariants`, `inlineCodeTextVariants`, `inlineWrapperVariants`, `prePanelVariants` and `useFieldWiring`. Codemod: `hds-patterns-subpath`.
- HdsCheckbox is removed from the package root; use Checkbox, the same component under its bare name. Codemod: `hds-prefix`.
- HdsRadio is removed from the package root; use Radio, the same component under its bare name. Codemod: `hds-prefix`.
- HdsSelect is removed from the package root; use Select, the same component under its bare name. Codemod: `hds-prefix`.
- HdsSlider is removed from the package root; use Slider, the same component under its bare name. Codemod: `hds-prefix`.
- HdsToggle is removed from the package root; use Toggle, the same component under its bare name. Codemod: `hds-prefix`.
- HdsTooltip is removed from the package root; use Tooltip, the same component under its bare name. Codemod: `hds-prefix`.
- NotFoundPattern is removed; use ErrorPattern displayText="404" message="Page not found" from @hirobius/design-system/patterns (hds-not-found-pattern rewrites it) instead.
- TileGrid is removed; use Grid layout="auto-fill" minItemWidth="…" gap="medium" (hds-tile-grid rewrites it) instead.

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
- Stack gap names 'tight', 'normal', 'inset' and 'spacious' still work and do not warn yet, but are removed in 1.0.0, and Stack names no replacement until then.
- StatusDot still works but is removed in 0.21.0; use Badge dot with the same tone, size and label, and move any style prop to a wrapper or a className first.
- StatusDotProps is removed in 0.21.0; use BadgeProps instead.
- hds.density still works but is deprecated; use hds.semantic.space.scale one step down, so density.sm becomes scale.xs. Removed in 1.0.0.
- Sixteen Tailwind utilities that only HDS's deleted internal files used, such as pt-1 and max-w-2xl, still ship in styles.css and tokens.css until 1.0.0, so a page that relies on HDS's compiled CSS for them should generate them with its own Tailwind. Removed in 1.0.0.

### Do by hand

- Each of these is removed with no drop-in replacement, so rewrite or delete the code that imports it: `ActivityEvent`, `ActivityFeed`, `ActivityFeedProps`, `ActivityStatus`, `ActivityTone`, `AppShell`, `AppShellProps`, `ButtonGroup`, `ButtonGroupProps`, `Calendar`, `CalendarProps`, `Carousel`, `CarouselProps`, `CaseStudyLayout`, `CaseStudyLayoutProps`, `CinematicLink`, `CinematicLinkProps`, `CommandPalette`, `CommandPaletteProps`, `ComponentInstanceMatrix`, `ContextMenu`, `DateInput`, `DateInputProps`, `DateRangeInput`, `DateRangeInputProps`, `DateTimeInput`, `DateTimeInputProps`, `DocLinkCard`, `DocLinkCardProps`, `ErrorBoundary`, `ErrorBoundaryProps`, `FileInput`, `FileInputProps`, `FoundationSwatch`, `FoundationSwatchProps`, `HdsDocsShell`, `HdsDocsShellProps`, `HdsSystemDocLayout`, `HeadingStack`, `HeadingStackProps`, `HistoryCard`, `HistoryCardCommit`, `HistoryCardProps`, `HoverCard`, `Lightbox`, `LightboxProps`, `NavGroup`, `NavGroupProps`, `NavItem`, `NavProps`, `OverflowList`, `OverflowListProps`, `SideNav`, `SideNavLevel`, `SideNavProps`, `Sketch`, `SketchProps`, `StackedCardRail`, `StackedCardRailCard`, `StackedCardRailProps`, `Step`, `Stepper`, `StepperField`, `StepperFieldProps`, `StepperProps`, `TextLockup`, `TextLockupProps`, `Token`, `TokenProps`, `Tokenizer`, `TokenizerProps`, `Toolbar`, `ToolbarComponent`, `TopNav`, `TopNavProps`, `TreeList`, `TreeListProps`, `TreeNode`, `activityAvatarVariants`, `activityToneVariants`, `appShellVariants`, `buttonGroupVariants`, `carouselControlVariants`, `circularProgressVariants`, `cmdkDescriptionVariants`, `cmdkKindBadgeVariants`, `cmdkRowVariants`, `defaultActivityEvents`, `docLinkCardVariants`, `fileInputVariants`, `hdsTimeInputVariants`, `hdsToggleButtonVariants`, `headingStackLevelVariants`, `headingStackVariants`, `navGroupLabelVariants`, `navIndicatorVariants`, `navItemVariants`, `selectableCardVariants`, `sideNavVariants`, `stepMarkerVariants`, `tokenLabelVariants`, `tokenNodeInlineVariants` and `tokenShellVariants`.
- Each of these is no longer exported, so style its component through the component's props instead: `badgeVariants`, `blockquoteVariants`, `buttonVariants`, `cardVariants`, `crumbLabelVariants`, `disclosureTriggerVariants`, `fieldValueVariants`, `inlineCodeVariants`, `inputVariants`, `kbdVariants`, `metadataListVariants`, `overflowBubbleVariants`, `progressTrackVariants`, `segmentedControlDescriptionVariants`, `segmentedControlFocusRingVariants`, `segmentedControlIndicatorVariants`, `segmentedControlItemVariants`, `segmentedControlLabelVariants`, `segmentedControlRailVariants`, `segmentedControlWrapperVariants`, `skeletonVariants`, `spinnerVariants`, `statVariants`, `statusDotVariants`, `statusListItemDotVariants`, `surfaceVariants`, `tableDataCellVariants`, `tableHeaderCellVariants`, `tableSortButtonVariants`, `tagButtonVariants`, `tagPillVariants`, `textVariants`, `textareaVariants` and `toastIconVariants`.
- AspectRatio is removed; use Box style={{ aspectRatio: '16 / 9' }} instead.
- Each of these is removed; use BoxProps instead: `AspectRatioProps`, `BleedProps`, `CoverProps` and `FrameProps`.
- Bleed is removed; use Box style={{ marginInline: 'calc(-1 \* var(--semantic-space-scale-md))' }} instead.
- Center is removed; use Container maxWidth="content", with a Box style={{ paddingInline }} inside for the gutter instead.
- CenterProps is removed; use ContainerProps instead.
- CircularProgress is removed; use Progress variant="circular" instead.
- CircularProgressProps is removed; use ProgressProps instead.
- Cluster is removed; use Stack direction="row" wrap="wrap" align="center" instead.
- ClusterProps is removed; use StackProps instead.
- Cover is removed; use Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }} around a Box style={{ marginBlock: 'auto' }} instead.
- Frame is removed; use Box style={{ aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: hds.borderRadius.md }} instead.
- IconButton is removed; use Button iconOnly label="…" iconLeft={\<Icon icon={…} />} instead.
- Each of these is removed; use ButtonProps instead: `IconButtonProps` and `ToggleButtonProps`.
- InputGroup is removed; use Input prefix / suffix instead.
- Each of these is removed; use InputProps instead: `InputGroupProps` and `TimeInputProps`.
- MultiSelector is removed; use Combobox multiple instead.
- MultiSelectorOption is removed; use ComboboxOption instead.
- MultiSelectorProps is removed; use ComboboxMultipleProps instead.
- SelectableCard is removed; use Card selectable selected onSelectedChange instead.
- SelectableCardProps is removed; use CardProps instead.
- TileGridProps is removed; use GridProps (minTileWidth is minItemWidth, gap 'sm' is 'medium') instead.
- TimeInput is removed; use Input type="time" instead.
- ToggleButton is removed; use Button pressed onPressedChange (variant="ghost" is variant="tertiary") instead.
- HDS no longer installs each of these, so add it to your own dependencies if your code imports it: `@radix-ui/react-aspect-ratio`, `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-toggle`, `@radix-ui/react-toolbar`, `date-fns` and `react-day-picker`.
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

- Importing each of these from the package root still works but is deprecated; import it from @hirobius/design-system/patterns instead: `ActivityFeed`, `AppShell`, `AssetImg`, `Calendar`, `Carousel`, `CodeBlock`, `CommandPalette`, `DocLinkCard`, `ErrorPattern`, `FileInput`, `Form`, `Lightbox`, `NavItem`, `OverflowList`, `Page`, `Reveal`, `SideNav`, `Stepper`, `Toolbar`, `TopNav` and `TreeList`. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- HdsCheckbox still works but is deprecated; use Checkbox, the same component under its bare name. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- HdsRadio still works but is deprecated; use Radio, the same component under its bare name. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- HdsSelect still works but is deprecated; use Select, the same component under its bare name. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- HdsSlider still works but is deprecated; use Slider, the same component under its bare name. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- HdsToggle still works but is deprecated; use Toggle, the same component under its bare name. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
- HdsTooltip still works but is deprecated; use Tooltip, the same component under its bare name. Removed early, in [0.20.0](#0200) (planned for 1.0.0).
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
