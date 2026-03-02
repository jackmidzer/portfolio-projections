import { Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HouseDepositCalculation } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface HouseDepositCardProps {
  age: number;
  houseMetrics: HouseDepositCalculation;
  mortgageExemption?: boolean;
}

export function HouseDepositCard({ age, houseMetrics, mortgageExemption = true }: HouseDepositCardProps) {
  const formulaText = mortgageExemption
    ? '(salary + bonus ÷ 2) × 4.5 (first-time buyer with exemption)'
    : '(salary + bonus ÷ 2) × 4 (standard first-time buyer)';

  const items = [
    { label: 'Projected Salary', value: formatCurrency(houseMetrics.projectedSalary) },
    { label: 'House Price', value: formatCurrency(houseMetrics.projectedHousePrice) },
    { label: 'Max Mortgage', value: formatCurrency(houseMetrics.projectedMortgage) },
    { label: 'Deposit Required', value: formatCurrency(houseMetrics.depositRequired) },
    { label: 'Loan-to-Value', value: `${houseMetrics.loanToValuePercent.toFixed(1)}%` },
  ];

  const mortgageItems = houseMetrics.monthlyMortgagePayment != null ? [
    { label: 'Monthly Repayment', value: formatCurrency(houseMetrics.monthlyMortgagePayment) },
    { label: 'Total Interest Paid', value: formatCurrency(houseMetrics.totalMortgageInterest ?? 0) },
  ] : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Home className="h-4 w-4" />
          House Purchase at Age {age}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {items.map(({ label, value }) => (
            <div key={label} className="space-y-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {mortgageItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {mortgageItems.map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Note:</span> Mortgage calculated as {formulaText}. This is the maximum amount a bank will lend based on projected income at age {age}. Capped at 90% LTV.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
