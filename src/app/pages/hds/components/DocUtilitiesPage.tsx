/**
 * DocUtilitiesPage - /hds/components/utilities
 *
 * Components: FoundationSwatch, MobiusLogo, CinematicLink, InfoPage,
 *   LegacyTokenDetail, LegacyTokenList, TokenCollectionList, TokenDetail
 * Category validated against: Material Design (Utilities), Ant Design (Other),
 * Chakra UI (Other) - storefront infrastructure, brand primitives, and token
 * governance helpers are grouped as maintenance utilities separate from product components.
 */

import { useTheme } from '../../../context/ThemeContext';
import { CategoryComponentDocs } from '../../../components/CategoryComponentDocs';
import { ComponentDocPageShell } from './ComponentDocPageShell';

export default function DocUtilitiesPage() {
  const { isDark } = useTheme();

  return (
    <ComponentDocPageShell
      title="Utilities"
      isDark={isDark}
      intro="Manifest-backed utilities and branding surfaces on one page."
    >
        <CategoryComponentDocs
          category="Utilities"
          isDark={isDark}
          preferredOrder={['FoundationSwatch']}
          defaultLayout="utility"
          hideDetails
          hideVariantDeck
          hideHero
        />
        <CategoryComponentDocs
          category="Branding"
          isDark={isDark}
          preferredOrder={['MobiusLogo', 'CinematicLink', 'InfoPage']}
          defaultLayout="utility"
          hideDetails
          hideVariantDeck
          hideHero
        />
        <CategoryComponentDocs
          category="Lab"
          isDark={isDark}
          preferredOrder={['LegacyTokenDetail', 'LegacyTokenList', 'TokenCollectionList', 'TokenDetail']}
          defaultLayout="utility"
          hideDetails
          hideVariantDeck
          hideHero
        />
    </ComponentDocPageShell>
  );
}
