import { RootLayout } from '@/navigation/RootLayout';

/**
 * Mount point only. The provider, the session bootstrap and the route guard live in
 * `src/navigation/RootLayout.tsx`, where it can be tested - Expo Router treats every `.tsx`
 * under `app/` as a route, so a test file here would ship as one.
 */
export default RootLayout;
