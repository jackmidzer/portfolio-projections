import type { AccountType } from '@/types';

/** Map an AccountType name to its badge variant */
export function toBadgeVariant(name: AccountType): 'savings' | 'pension' | 'brokerage' {
  if (name === 'Savings') return 'savings';
  if (name === 'Pension') return 'pension';
  return 'brokerage';
}
