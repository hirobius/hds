/**
 * @hirobius/design-system/contexts
 *
 * App-shell providers + hooks shared by the design-system site and any
 * consuming app (e.g. the ops dashboard). These wrap the document with the
 * theme/density, reading-direction, tenant, and font state the tokens and
 * components rely on. Wrap your app root in:
 *
 *   <TenantProvider><LanguageProvider><ThemeProvider><FontProvider>
 *     {app}
 *   </FontProvider></ThemeProvider></LanguageProvider></TenantProvider>
 */
export * from './ThemeContext';
export * from './HdsThemeProvider';
export * from './LanguageContext';
export * from './TenantContext';
export * from './FontContext';
export * from './DemoStateContext';
export * from './TokenDisplayContext';
export * from './RouterContext';
