'use client';

import type { ReactNode } from 'react';
import { Card, Disclosure, Text } from '@hirobius/design-system';

/**
 * A foundation page's Principle and Best practices, folded into one collapsed
 * section below the tokens (hds#847 C). Built only from HDS parts: a bordered
 * Card around a Disclosure, which brings its own chevron and expanded state.
 */
export function PrinciplesAndPractices({ children }: { children: ReactNode }) {
  return (
    <Card bordered padding="none" className="hds-principles">
      <Disclosure
        label={
          <Text variant="titleSm" as="span">
            Principles and best practices
          </Text>
        }
      >
        <div className="hds-principles-body">{children}</div>
      </Disclosure>
    </Card>
  );
}
