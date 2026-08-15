import { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { QueryProvider } from '@/services/queryClient';

/**
 * The client every hook test renders against.
 *
 * Retries are off. With the default policy a hook test asserting an error state waits through three
 * backed-off retries before the failure surfaces, which reads as a hanging test rather than a
 * failing one - and an error mapped to the wrong type would take the timeout to reveal itself.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/** `renderHook(..., { wrapper: createQueryWrapper(client) })`. */
export function createQueryWrapper(client: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return <QueryProvider client={client}>{children}</QueryProvider>;
  };
}
