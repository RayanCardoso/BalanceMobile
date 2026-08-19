import { PeopleScreen } from '@/screens/People/PeopleScreen';

/**
 * Ponto de montagem apenas. A tela vive em `src/screens/`, que é o único lugar onde o seu teste pode
 * viver: o Expo Router trata todo `.tsx` sob `app/` como rota, e um `index.test.tsx` aqui seria
 * publicado como `/people/index.test`.
 */
export default PeopleScreen;
