import type { ReactNode } from 'react';
import { DocPageHeader } from '../HdsDocPrimitives';
import { HdsSystemDocLayout } from '../HdsSystemDocLayout';
import { Stack } from '../../../components/stack';

export function ComponentDocPageShell({
  title,
  intro,
  isDark,
  children,
}: {
  title: string;
  intro: ReactNode;
  isDark: boolean;
  children: ReactNode;
}) {
  return (
    <HdsSystemDocLayout
      contentMaxWidth="max"
      contentSlot={(
        <Stack gap="spacious" style={{ minWidth: 0 }}>
          <DocPageHeader
            group="Components"
            title={title}
            isDark={isDark}
            intro={intro}
          />
          {children}
        </Stack>
      )}
    />
  );
}
