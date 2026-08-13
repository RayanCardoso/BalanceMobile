import { RootLayout } from '@/features/auth/ui/RootLayout';

/**
 * Mount point only. The provider, the session bootstrap and the route guard live in
 * `src/features/auth/ui/RootLayout.tsx`, where they can be tested - Expo Router treats every `.tsx`
 * under `app/` as a route, so a test file here would ship as one.
 */
export default RootLayout;
