/**
 * Every `$description` in hirobius.tokens.json, keyed by the dot path of the token or group
 * that holds it ('' is the file's own description). It ships apart from `tokens`
 * (`@hirobius/design-system/tokens`) so an app that needs only values does not load the prose.
 *
 *   import { tokenDescriptions } from '@hirobius/design-system/tokens/descriptions';
 *   tokenDescriptions['semantic.accent.rest'];
 */
import descriptions from './generated-tokens-descriptions.json';

/** Token and group descriptions by dot path. */
export const tokenDescriptions: Readonly<Record<string, string>> = descriptions;
