// Fixture: route not present in ALL_ROUTES → gate must exit non-zero.
import { createBrowserRouter } from 'react-router';

export const router = createBrowserRouter([{ path: '/ghost-route-uncovered', element: <div /> }]);
