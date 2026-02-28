import { AlertTriangle } from 'lucide-react';
import { useProjectionStore } from '@/store/useProjectionStore';

export function NegativeBalanceBanner() {
  const results = useProjectionStore(s => s.results);

  if (!results) return null;

  const warnings: { accountName: string; age: number }[] = [];
  for (const accountResult of results.accountResults) {
    for (const year of accountResult.yearlyData) {
      if (year.endingBalance < 0) {
        warnings.push({ accountName: accountResult.accountName, age: year.age });
        break; // only the first occurrence per account
      }
    }
  }

  if (warnings.length === 0) return null;

  return (
    <div className="sticky top-0 z-10 border-b border-amber-500/40 bg-amber-500/10 backdrop-blur-sm dark:border-amber-400/30 dark:bg-amber-400/10">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-start gap-3 text-amber-700 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-semibold text-sm">
            {warnings.length === 1
              ? 'An account balance goes negative:'
              : 'Some account balances go negative:'}
          </span>
          <span className="text-sm">
            {warnings.map((w, i) => (
              <span key={w.accountName}>
                {i > 0 && <span className="mx-1 opacity-50">·</span>}
                <span className="font-medium">{w.accountName}</span>
                {' '}at age <span className="font-medium">{w.age}</span>
              </span>
            ))}
          </span>
          <span className="text-xs opacity-70 ml-auto hidden sm:inline">
            Adjust withdrawal rates, contributions, or target age to resolve this.
          </span>
        </div>
      </div>
    </div>
  );
}
