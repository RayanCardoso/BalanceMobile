import { LoginScreen } from '@/screens/Login/LoginScreen';

/**
 * The route is a mount point only. The screen itself lives in `src/screens/Login/`, which is
 * where screen code and its test can
 * live: Expo Router treats every `.tsx` under `app/` as a route, so `sign-in.test.tsx` here would
 * be published as `/sign-in.test`.
 */
export default LoginScreen;
