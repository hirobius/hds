/**
 * Shared width contract for text-entry form controls (Input, Textarea, Select,
 * Combobox, Slider): they fill their container up to a maximum, so a field in
 * a wide Surface does not stretch to 1152px (hds#522).
 *
 * The cap is 40rem by default. Override it per tree or per control by setting
 * the `--hds-form-control-max-width` custom property (any CSS length, or
 * `none`), or pass `className="max-w-none"` where the control takes one.
 */
export const FORM_CONTROL_WIDTH = 'w-full max-w-[var(--hds-form-control-max-width,40rem)]';
