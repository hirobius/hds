import {
  Stack,
  NotFoundPattern as Missing, // the 404 route
} from '@hirobius/design-system';
import { Page } from '@hirobius/design-system/patterns';

export const routes = [
  {
    path: '*',
    element: (
      <Page>
        <Stack>
          <Missing key="404" />
        </Stack>
      </Page>
    ),
  },
];
