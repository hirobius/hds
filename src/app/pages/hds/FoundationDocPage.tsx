import type { ReactNode } from 'react';
import { TextLockup } from '../../components/text-lockup';
import { Stack } from '../../components/stack';
import { DocLayout } from '../../layouts/DocLayout';


export function FoundationDocPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="hds-page-enter">
      <DocLayout
        contentSlot={(
          <Stack gap="px24" style={{ minWidth: 0 }}>
            <TextLockup
              eyebrow="Foundations"
              title={title}
              description={description}
              size="hero"
            />
            {children}
          </Stack>
        )}
        contentMaxWidth="content"
      />
    </div>
  );
}
