import { createBrowserRouter } from 'react-router';
import { routeTree } from './route-tree';

// Client router. The route definitions live in ./route-tree so the SSR/prerender
// entry can reuse them without executing createBrowserRouter (which touches
// `document` at module load and would throw during server rendering).
export const router = createBrowserRouter(routeTree);
