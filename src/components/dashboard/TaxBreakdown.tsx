import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TaxCalculationResult } from '@/types';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

interface TaxBreakdownProps {
  result: TaxCalculationResult;
  showDetail?: boolean;
}

export function TaxBreakdown({ result, showDetail = true }: TaxBreakdownProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Salary Breakdown (After Taxes &amp; Pension)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top summary */}
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Annual Take-Home</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(result.netSalary)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Monthly Take-Home</p>
            <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(result.monthlyNetSalary)}
            </p>
          </div>
        </div>

        {showDetail && (
          <div className="space-y-3">
            {/* Gross & Taxable */}
            <Row label="Gross Salary" value={formatCurrency(result.grossSalary)} bold />
            {result.pensionContribution > 0 && (
              <Row label="Pension Contribution" value={formatCurrency(result.pensionContribution)} indent muted />
            )}
            {result.bikValue > 0 && (
              <Row label="BIK Value" value={formatCurrency(result.bikValue)} indent muted />
            )}
            <Row label="Taxable Income" value={formatCurrency(result.taxableIncome)} bold />

            <Separator />

            {/* PAYE */}
            <Section title="PAYE Tax Bands" color="blue">
              {result.payeTaxBands.map((band, idx) => (
                <Row key={idx} indent muted
                  label={`€${band.threshold === Infinity ? `${band.startThreshold.toLocaleString()}+` : `${band.startThreshold.toLocaleString()} – €${band.threshold.toLocaleString()}`}: ${band.rate.toFixed(0)}%`}
                  value={`€${band.taxInBand.toFixed(2)}`}
                />
              ))}
              <Row indent bold
                label="PAYE Tax (before credits)"
                value={`€${result.payeTaxBands.reduce((s, b) => s + b.taxInBand, 0).toFixed(2)}`}
                className="border-t border-blue-200 pt-1.5 dark:border-blue-800"
              />
            </Section>

            {/* Tax Credits */}
            <Section title="Tax Credits Applied" color="green">
              <Row indent muted label="Personal Credit" value={`€${result.taxCreditsApplied.personal.toFixed(2)}`} />
              <Row indent muted label="Earned Income Credit" value={`€${result.taxCreditsApplied.earned.toFixed(2)}`} />
              <Row indent muted label="Medical Insurance Credit" value={`€${result.taxCreditsApplied.medicalInsurance.toFixed(2)}`} />
              <Row indent muted label="Rent Relief Credit" value={`€${result.taxCreditsApplied.rentRelief.toFixed(2)}`} />
              <Row indent bold
                label="PAYE Tax (after credits)"
                value={`€${result.payeTax.toFixed(2)}`}
                className="border-t border-emerald-200 pt-1.5 dark:border-emerald-800"
              />
            </Section>

            {/* USC */}
            <Section title="USC (Universal Social Charge)" color="purple">
              {result.uscBands.map((band, idx) => (
                <Row key={idx} indent muted
                  label={`€${band.threshold === Infinity ? `${band.startThreshold.toLocaleString()}+` : `${band.startThreshold.toLocaleString()} – €${band.threshold.toLocaleString()}`}: ${band.rate}%`}
                  value={`€${band.uscInBand.toFixed(2)}`}
                />
              ))}
              <Row indent bold
                label="Total USC"
                value={`€${result.usc.toFixed(2)}`}
                className="border-t border-violet-200 pt-1.5 dark:border-violet-800"
              />
            </Section>

            {/* PRSI */}
            <Section title="PRSI (Social Insurance)" color="orange">
              <Row indent muted
                label={`Employee Rate: ${result.prsiPercentUsed.toFixed(1)}%`}
                value={`€${result.prsi.toFixed(2)}`}
              />
            </Section>

            <Separator />

            {/* Deductions total */}
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/10">
              <Row bold label="Total Deductions" value={`€${result.totalDeductions.toFixed(2)}`} className="text-red-600 dark:text-red-400" />
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Effective Tax Rate</p>
                <p className="text-lg font-bold tabular-nums text-primary">{formatPercentage(result.effectiveTaxRate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net / Month</p>
                <p className="text-lg font-bold tabular-nums text-primary">{formatCurrency(result.monthlyNetSalary)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Compact view */}
        {!showDetail && (
          <div className="grid grid-cols-2 gap-3 text-center">
            <Stat label="PAYE" value={formatCurrency(result.payeTax)} />
            <Stat label="USC" value={formatCurrency(result.usc)} />
            <Stat label="PRSI" value={formatCurrency(result.prsi)} />
            <Stat label="Tax Rate" value={formatPercentage(result.effectiveTaxRate)} />
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          * Based on Irish 2026 tax year rates. Pension contributions reduce taxable income for PAYE. BIK and gross salary are subject to USC and PRSI.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Sub-components ──────────────────────────
function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-50/80 dark:bg-blue-900/10',
    green: 'bg-emerald-50/80 dark:bg-emerald-900/10',
    purple: 'bg-violet-50/80 dark:bg-violet-900/10',
    orange: 'bg-amber-50/80 dark:bg-amber-900/10',
  };
  const textMap: Record<string, string> = {
    blue: 'text-blue-700 dark:text-blue-400',
    green: 'text-emerald-700 dark:text-emerald-400',
    purple: 'text-violet-700 dark:text-violet-400',
    orange: 'text-amber-700 dark:text-amber-400',
  };
  return (
    <div className={`space-y-1.5 rounded-lg p-3 ${bgMap[color] || ''}`}>
      <p className={`text-xs font-semibold ${textMap[color] || ''}`}>{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value, bold, indent, muted, className }: {
  label: string; value: string; bold?: boolean; indent?: boolean; muted?: boolean; className?: string;
}) {
  return (
    <div className={`flex justify-between gap-2 text-sm ${indent ? 'ml-2' : ''} ${className || ''}`}>
      <span className={`min-w-0 ${muted ? 'text-muted-foreground' : bold ? 'font-semibold' : ''}`}>{label}</span>
      <span className={`tabular-nums font-mono shrink-0 ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
