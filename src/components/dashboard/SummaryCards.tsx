import { TrendingUp, PiggyBank, Landmark, Wallet, Briefcase } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PortfolioResults } from '@/types';
import { formatCurrency, deflate } from '@/utils/formatters';
import { toBadgeVariant } from '@/utils/badgeVariant';

interface SummaryCardsProps {
  results: PortfolioResults;
  showRealValues?: boolean;
  inflationRate?: number;
  currentAge?: number;
}

const stats = [
  { key: 'initial', label: 'Initial Balance', icon: PiggyBank },
  { key: 'contributions', label: 'Total Contributions', icon: Wallet },
  { key: 'interest', label: 'Total Interest', icon: TrendingUp },
  { key: 'final', label: 'Final Balance', icon: Landmark },
  { key: 'salary', label: 'Final Salary', icon: Briefcase },
] as const;

export function SummaryCards({ results, showRealValues, inflationRate = 2.5, currentAge }: SummaryCardsProps) {
  const initialBalance = results.accountResults.reduce(
    (sum, r) => sum + r.yearlyData[0].startingBalance, 0
  );

  const startAge = results.accountResults[0]?.yearlyData[0]?.age;
  const endAge = results.accountResults[0]?.yearlyData.slice(-1)[0]?.age;
  const effectiveCurrentAge = currentAge ?? startAge;

  // Deflation helper – deflates to present value if showRealValues is on
  const yearsToEnd = endAge != null && effectiveCurrentAge != null ? endAge - effectiveCurrentAge : 0;
  const adj = (value: number, years?: number) =>
    showRealValues ? deflate(value, years ?? yearsToEnd, inflationRate) : value;

  const values: Record<string, number> = {
    initial: initialBalance,
    contributions: adj(results.totalContributions),
    interest: adj(results.totalInterest),
    final: adj(results.totalFinalBalance),
    salary: adj(results.finalSalary),
  };

  const subtitle = showRealValues ? '(Real €)' : '(Nominal €)';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Overall Summary <span className="text-sm font-normal text-muted-foreground">{subtitle}</span>
        </h2>
        {startAge && endAge && (
          <span className="text-sm text-muted-foreground">
            Age {startAge} → {endAge}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrency(values[key])}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Account Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {results.accountResults.map((result) => {
          const variant = toBadgeVariant(result.accountName);
          return (
            <Card key={result.accountName} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={variant}>{result.accountName}</Badge>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-medium tabular-nums">{formatCurrency(adj(result.finalBalance))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contributed</span>
                    <span className="font-medium tabular-nums">{formatCurrency(adj(result.totalContributions))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interest</span>
                    <span className="font-medium tabular-nums">{formatCurrency(adj(result.totalInterest))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
