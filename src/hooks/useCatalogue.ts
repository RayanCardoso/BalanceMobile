import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  Account,
  Category,
  CategoryPriority,
  Person,
} from '@/types/catalogue';
import { get, post } from '@/services/api';
import { qk } from '@/services/queryKeys';

/**
 * The catalogue's three lists and the three mutations that add to them.
 *
 * Spec CAT AC2 is the load-bearing part: a created item has to appear "without a manual refresh".
 * That is not what the POST does - it is what the `invalidateQueries` in each `onSuccess` does, by
 * making the list query read the API again. The key comes from `qk` (MAD-002) so the mutation cannot
 * invalidate a string the query never registered under.
 *
 * Each `onSuccess` returns its promise, so the mutation stays pending until the refreshed list has
 * arrived. A screen closing a form on success then closes it over data that is already correct.
 */

export type CreatePersonInput = { name: string; description: string | null };

export type CreateCategoryInput = {
  name: string;
  description: string | null;
  priority: CategoryPriority;
};

export type CreateAccountInput = {
  name: string;
  institution: string;
  personId: string;
  closingDay: number | null;
  dueDay: number | null;
  limit: number | null;
};

export function usePeople(): UseQueryResult<Person[], Error> {
  return useQuery({
    queryKey: qk.people(),
    queryFn: async (): Promise<Person[]> => (await get<{ people: Person[] }>('/person')).people,
  });
}

export function useCategories(): UseQueryResult<Category[], Error> {
  return useQuery({
    queryKey: qk.categories(),
    queryFn: async (): Promise<Category[]> =>
      (await get<{ categories: Category[] }>('/category')).categories,
  });
}

export function useAccounts(): UseQueryResult<Account[], Error> {
  return useQuery({
    queryKey: qk.accounts(),
    queryFn: async (): Promise<Account[]> =>
      (await get<{ accounts: Account[] }>('/account')).accounts,
  });
}

export function useCreatePerson(): UseMutationResult<Person, Error, CreatePersonInput> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePersonInput) => post<Person>('/person', input),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.people() }),
  });
}

export function useCreateCategory(): UseMutationResult<Category, Error, CreateCategoryInput> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => post<Category>('/category', input),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.categories() }),
  });
}

export function useCreateAccount(): UseMutationResult<Account, Error, CreateAccountInput> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAccountInput) => post<Account>('/account', input),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.accounts() }),
  });
}
