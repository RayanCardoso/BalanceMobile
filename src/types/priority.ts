import type { CategoryPriority } from '@/types/catalogue';

/**
 * Spec CAT AC3. `CategoryPriority` being the union `0 | 1 | 2` (not `number`) means this record is
 * exhaustive by the type checker: leaving a value out is a compile error, not a runtime default
 * branch nobody looked at.
 */
export const PRIORITY_LABEL: Record<CategoryPriority, string> = {
  0: 'Essencial',
  1: 'Importante',
  2: 'Supérfluo',
};

export const PRIORITY_OPTIONS: { label: string; value: CategoryPriority }[] = [
  { label: 'Essencial', value: 0 },
  { label: 'Importante', value: 1 },
  { label: 'Supérfluo', value: 2 },
];
