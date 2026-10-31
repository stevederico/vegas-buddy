/**
 * Application entry point using Skateboard Application Shell Architecture
 *
 * Configures routing and initializes app with skateboard-ui framework.
 * The shell (skateboard-ui) provides:
 * - Routing system with React Router v7
 * - Context/state management
 * - Authentication flow
 * - Common UI components (Header, Footer, UpgradeSheet)
 * - Utility functions (apiRequest, usage tracking)
 *
 * This file only defines:
 * - Custom view components
 * - Route configuration
 * - App constants
 *
 * @see {@link https://github.com/stevederico/skateboard|Skateboard Docs}
 */
import './assets/styles.css';
import 'leaflet/dist/leaflet.css';
import { lazy, Suspense } from 'react';
import { createSkateboardApp } from '@stevederico/skateboard-ui/App';
import type { AppRoute } from '@stevederico/skateboard-ui/App';
import { Spinner } from '@stevederico/skateboard-ui/shadcn/ui/spinner';
import Layout from '@stevederico/skateboard-ui/Layout';
import CommandMenu from './components/CommandMenu';
import constants from './constants.json';

const DrinksView = lazy(() => import('./components/DrinksView'));
const FoodView = lazy(() => import('./components/FoodView'));
const AttractionsView = lazy(() => import('./components/AttractionsView'));

/**
 * App layout with global command menu overlay.
 *
 * Wraps the default skateboard-ui Layout and injects CommandMenu
 * so the Cmd+K shortcut is available on all authenticated routes.
 *
 * @returns Layout with command menu
 */
function AppLayout() {
  return (
    <>
      <CommandMenu />
      <Layout />
    </>
  );
}

const suspenseFallback = <div className="flex flex-1 items-center justify-center"><Spinner /></div>;

/**
 * Application route configuration
 *
 * Maps route paths to view components. Routes are relative to root (no leading slash).
 * The shell handles route registration, navigation, and layout.
 */
const appRoutes: AppRoute[] = [
  { path: 'drinks', element: <Suspense fallback={suspenseFallback}><DrinksView /></Suspense> },
  { path: 'food', element: <Suspense fallback={suspenseFallback}><FoodView /></Suspense> },
  { path: 'attractions', element: <Suspense fallback={suspenseFallback}><AttractionsView /></Suspense> },
];

/**
 * Initialize and mount Skateboard app
 *
 * Creates React root, configures router, initializes context/state,
 * and renders app shell. Automatically handles:
 * - User authentication state
 * - Protected routes
 * - Navigation setup
 * - Footer with app info
 *
 * @param config - App configuration
 * @param config.constants - App constants from constants.json
 * @param config.appRoutes - Route configuration array
 * @param config.defaultRoute - Initial route path
 */
createSkateboardApp({
  constants,
  appRoutes,
  defaultRoute: 'drinks',
  overrides: { layout: AppLayout },
  loadLegal: () => import('./legal.json'),
});
