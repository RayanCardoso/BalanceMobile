import { SignInScreen } from '@/features/auth/ui/SignInScreen';

/**
 * The route is a mount point only. The screen itself lives in `src/features/auth/ui/`, which is
 * where the design puts feature screens and, just as importantly, is the only place its test can
 * live: Expo Router treats every `.tsx` under `app/` as a route, so `sign-in.test.tsx` here would
 * be published as `/sign-in.test`.
 */
export default SignInScreen;
