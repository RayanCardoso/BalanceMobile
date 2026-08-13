import { PeopleScreen } from '@/features/catalogue/ui/PeopleScreen';

/**
 * Mount point only. The screen lives in `src/features/catalogue/ui/`, which is where the design puts
 * feature screens and the only place its test can live: Expo Router treats every `.tsx` under `app/`
 * as a route, so `people.test.tsx` here would be published as `/catalogue/people.test`.
 */
export default PeopleScreen;
