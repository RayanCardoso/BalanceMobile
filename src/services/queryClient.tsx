import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * The Query cache holds everything that came from the API (MAD-002). One client is created at the
 * root layout and handed to the whole tree; `signOut` clears it, so one account never reads the
 * cached data of another.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient();
}

export function QueryProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}): React.JSX.Element {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
