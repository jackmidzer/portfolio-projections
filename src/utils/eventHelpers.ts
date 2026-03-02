import type { PortfolioResults, AccountInput } from '@/types';
import { getAgeBracketPercentage, getEmployerAgeBracketPercentage } from './calculations';

/**
 * Categories for financial lifecycle events.
 */
export type EventCategory =
  | 'contribution'
  | 'withdrawal'
  | 'tax'
  | 'milestone'
  | 'pension'
  | 'house';

/**
 * A single financial event at a specific age.
 */
export interface LifecycleEvent {
  age: number;
  title: string;
  description: string;
  category: EventCategory;
  /** Icon hint for rendering */
  icon: 'house' | 'fire' | 'pension' | 'tax' | 'piggy' | 'trending' | 'alert' | 'clock' | 'shield' | 'wallet';
}

/**
 * Generate a chronological list of all financial events for the given
 * projection results and input configuration.
 */
export function generateLifecycleEvents(
  results: PortfolioResults,
  accounts: AccountInput[],
  currentAge: number,
  targetAge: number,
  opts: {
    enableHouseWithdrawal?: boolean;
    houseWithdrawalAge?: number;
    enablePensionLumpSum?: boolean;
    pensionLumpSumAge?: number;
    pensionLumpSumMaxAmount?: number;
    includeStatePension?: boolean;
    statePensionAge?: number;
    statePensionWeeklyAmount?: number;
    withdrawalRate?: number;
    etfAllocationPercent?: number;
  },
): LifecycleEvent[] {
  const events: LifecycleEvent[] = [];
  const fireAge = results.fireAge;
  const pensionAge = results.pensionAge;

  const pension = accounts.find(a => a.name === 'Pension');
  const brokerage = accounts.find(a => a.name === 'Brokerage');
  const etfPct = brokerage?.etfAllocationPercent ?? 50;

  // ── Pension Contribution Bracket Changes ─────────────────────────
  if (pension?.ageBracketContributions) {
    const bracketAges = [30, 40, 50, 55, 60];
    for (const age of bracketAges) {
      if (age > currentAge && age < fireAge && age <= targetAge) {
        const prevPct = getAgeBracketPercentage(age - 1, pension.ageBracketContributions);
        const newPct = getAgeBracketPercentage(age, pension.ageBracketContributions);
        if (newPct !== prevPct) {
          events.push({
            age,
            title: `Pension contribution → ${newPct}%`,
            description: `Your employee pension contribution increases from ${prevPct}% to ${newPct}% of salary at age ${age} (Irish Revenue age-bracket limits).`,
            category: 'contribution',
            icon: 'trending',
          });
        }
      }
    }
  }

  // ── Employer Pension Bracket Changes ─────────────────────────────
  if (pension?.employerAgeBracketContributions) {
    const bracketAges = [25, 30, 35, 40, 45, 50, 55];
    for (const age of bracketAges) {
      if (age > currentAge && age < fireAge && age <= targetAge) {
        const prevPct = getEmployerAgeBracketPercentage(age - 1, pension.employerAgeBracketContributions);
        const newPct = getEmployerAgeBracketPercentage(age, pension.employerAgeBracketContributions);
        if (newPct !== prevPct) {
          events.push({
            age,
            title: `Employer pension → ${newPct}%`,
            description: `Your employer's pension contribution increases from ${prevPct}% to ${newPct}% of salary at age ${age}.`,
            category: 'contribution',
            icon: 'piggy',
          });
        }
      }
    }
  }

  // ── House Purchase ──────────────────────────────────────────────
  if (opts.enableHouseWithdrawal && opts.houseWithdrawalAge && opts.houseWithdrawalAge >= currentAge && opts.houseWithdrawalAge <= targetAge) {
    events.push({
      age: opts.houseWithdrawalAge,
      title: 'House deposit withdrawal',
      description: `Savings and brokerage accounts are drawn down to fund your house deposit. Brokerage withdrawals are subject to CGT (33%) on stocks and exit tax (38%) on ETFs.`,
      category: 'house',
      icon: 'house',
    });
  }

  // ── Deemed Disposal (every 8 years from start on ETF portion) ──
  if (etfPct > 0) {
    for (let age = currentAge + 8; age <= targetAge; age += 8) {
      events.push({
        age,
        title: 'Deemed disposal (ETF)',
        description: `Every 8 years, unrealised gains on the ETF portion (${etfPct}%) of your brokerage are taxed at 38% exit tax. The cost basis resets after each event.`,
        category: 'tax',
        icon: 'tax',
      });
    }
  }

  // ── FIRE ────────────────────────────────────────────────────────
  if (fireAge >= currentAge && fireAge <= targetAge) {
    events.push({
      age: fireAge,
      title: 'FIRE — early retirement',
      description: `You stop working. Salary, contributions, and employer match all cease. Bridging withdrawals from your brokerage begin (targeting ${opts.withdrawalRate ?? 4}% of balance or salary replacement rate), subject to CGT/exit tax.`,
      category: 'milestone',
      icon: 'fire',
    });
  }

  // ── Pension Lump Sum ────────────────────────────────────────────
  if (opts.enablePensionLumpSum && opts.pensionLumpSumAge && opts.pensionLumpSumAge >= currentAge && opts.pensionLumpSumAge <= targetAge) {
    const maxAmt = opts.pensionLumpSumMaxAmount ?? 200000;
    events.push({
      age: opts.pensionLumpSumAge,
      title: 'Pension lump sum withdrawal',
      description: `25% of your pension fund is withdrawn as a lump sum (capped at €${(maxAmt / 1000).toFixed(0)}k). First €200k is tax-free, €200k–500k taxed at 20%, above €500k at 40%. Net proceeds are distributed to savings/brokerage.`,
      category: 'pension',
      icon: 'wallet',
    });
  }

  // ── Pension Drawdown Starts ─────────────────────────────────────
  if (pensionAge >= currentAge && pensionAge <= targetAge) {
    events.push({
      age: pensionAge,
      title: 'Pension drawdown begins',
      description: `You start withdrawing from your pension fund. Withdrawals are taxed as income (PAYE + USC + PRSI if under 66). Bridging brokerage withdrawals stop.`,
      category: 'pension',
      icon: 'pension',
    });
  }

  // ── Forced Minimum Withdrawal — 4% at age 61 ──────────────────
  if (61 >= currentAge && 61 <= targetAge && pensionAge <= 61) {
    events.push({
      age: 61,
      title: 'Forced min. withdrawal 4%',
      description: `From age 61, Irish regulations require a minimum 4% annual drawdown from your ARF pension, regardless of your chosen withdrawal rate.`,
      category: 'withdrawal',
      icon: 'alert',
    });
  }

  // ── Age Tax Credit — age 65 ────────────────────────────────────
  if (65 >= currentAge && 65 <= targetAge) {
    events.push({
      age: 65,
      title: '€245 age tax credit',
      description: `At age 65, you receive an additional €245 annual tax credit on pension withdrawal income, reducing your total PAYE liability.`,
      category: 'tax',
      icon: 'shield',
    });
  }

  // ── State Pension + PRSI Exemption — age 66 ────────────────────
  if (opts.includeStatePension && opts.statePensionAge && opts.statePensionAge >= currentAge && opts.statePensionAge <= targetAge) {
    const weekly = opts.statePensionWeeklyAmount ?? 299.30;
    const annual = weekly * 52;
    events.push({
      age: opts.statePensionAge,
      title: 'State pension starts',
      description: `You begin receiving the Irish State Pension of €${weekly.toFixed(2)}/week (€${annual.toFixed(0)}/year). This is taxable income (PAYE + USC) but reduces how much you need from your own funds.`,
      category: 'pension',
      icon: 'clock',
    });
  }

  // PRSI exemption at 66 (always relevant if they reach it)
  if (66 >= currentAge && 66 <= targetAge) {
    events.push({
      age: 66,
      title: 'PRSI exemption',
      description: `From age 66, you are exempt from PRSI (4.2375%) on pension withdrawal income, giving a meaningful tax reduction.`,
      category: 'tax',
      icon: 'shield',
    });
  }

  // ── Forced Minimum Withdrawal — 5% at age 71 ──────────────────
  if (71 >= currentAge && 71 <= targetAge && pensionAge <= 71) {
    events.push({
      age: 71,
      title: 'Forced min. withdrawal → 5%',
      description: `From age 71, the minimum ARF drawdown increases to 5% per year. If your chosen rate is lower, the forced minimum applies instead.`,
      category: 'withdrawal',
      icon: 'alert',
    });
  }

  // Sort by age, then by a stable category order
  const categoryOrder: EventCategory[] = ['house', 'contribution', 'milestone', 'pension', 'withdrawal', 'tax'];
  events.sort((a, b) => {
    if (a.age !== b.age) return a.age - b.age;
    return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
  });

  return events;
}

/**
 * Get events that apply to a specific age (for table row badges).
 */
export function getEventsForAge(events: LifecycleEvent[], age: number): LifecycleEvent[] {
  return events.filter(e => e.age === age);
}

/**
 * Map event category to a color scheme for badges/pills.
 */
export function getEventCategoryColor(category: EventCategory): {
  bg: string;
  text: string;
  border: string;
} {
  switch (category) {
    case 'contribution':
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700' };
    case 'withdrawal':
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700' };
    case 'tax':
      return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' };
    case 'milestone':
      return { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-700' };
    case 'pension':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' };
    case 'house':
      return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-700' };
  }
}
