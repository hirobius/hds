/**
 * @hirobius/design-system/number — opt-in animated numbers.
 *
 * Ships behind a dedicated subpath with `@number-flow/react` as an OPTIONAL
 * peer dependency (install it alongside HDS to use `NumberValue`). Never in the
 * main barrel: consumers who don't import this pay nothing (hds#751).
 */
export { NumberValue, type NumberValueProps } from './number-value';
