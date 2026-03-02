import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldOff, Briefcase, Landmark, Euro } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useProjectionStore } from '@/store/useProjectionStore';
import {
  calculatePrsiSummary,
  PRSI_MIN_CONTRIBUTIONS,
  PRSI_FULL_CONTRIBUTIONS,
} from '@/utils/taxCalculations';
import type { PrsiSummary } from '@/utils/taxCalculations';
import { formatCurrency } from '@/utils/formatters';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  full: {
    Icon: ShieldCheck,
    borderCls: 'border-emerald-500/30 bg-emerald-500/10',
    iconCls: 'text-emerald-500',
    headingCls: 'text-emerald-600 dark:text-emerald-400',
    barCls: 'bg-emerald-500',
    label: 'Full State Pension',
    sublabel: 'Qualifies for full contributory rate',
  },
  partial: {
    Icon: ShieldAlert,
    borderCls: 'border-amber-500/30 bg-amber-500/10',
    iconCls: 'text-amber-500',
    headingCls: 'text-amber-600 dark:text-amber-400',
    barCls: 'bg-amber-500',
    label: 'Partial State Pension',
    sublabel: 'Qualifies for reduced rate only',
  },
  none: {
    Icon: ShieldOff,
    borderCls: 'border-destructive/30 bg-destructive/10',
    iconCls: 'text-destructive',
    headingCls: 'text-destructive',
    barCls: 'bg-destructive',
    label: 'No Entitlement',
    sublabel: `Minimum ${PRSI_MIN_CONTRIBUTIONS.toLocaleString()} contributions not met`,
  },
} as const;

// ─── Inner display helpers ─────────────────────────────────────────────────────

function ContributionRow({
  label,
  value,
  icon: RowIcon,
  muted,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className={`flex items-center gap-1.5 text-xs ${muted ? 'text-muted-foreground' : 'text-foreground/70'}`}>
        {RowIcon && <RowIcon className="h-3 w-3 shrink-0 text-muted-foreground" />}
        {label}
      </span>
      <span className="font-medium tabular-nums text-xs">{value}</span>
    </div>
  );
}

function PrsiCardContent({ summary }: { summary: PrsiSummary }) {
  const {
    status,
    totalContributions,
    priorContributions,
    projectedEmploymentContributions,
    projectedPensionContributions,
    shortfallToFull,
    additionalYearsToFull,
    percentOfFull,
    estimatedWeeklyStatePension,
    estimatedAnnualStatePension,
  } = summary;

  const cfg = STATUS_CONFIG[status];
  const { Icon } = cfg;

  return (
    <Card className={`overflow-hidden border ${cfg.borderCls}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 shrink-0 ${cfg.iconCls}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-none ${cfg.headingCls}`}>{cfg.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{cfg.sublabel}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold tabular-nums leading-none">{percentOfFull}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">of full rate</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${cfg.barCls}`}
            style={{ width: `${percentOfFull}%` }}
          />
        </div>

        {/* Contribution source breakdown */}
        <div className="space-y-1.5 pt-0.5">
          {priorContributions > 0 && (
            <ContributionRow
              label="Prior contributions"
              value={priorContributions.toLocaleString()}
              muted
            />
          )}
          <ContributionRow
            label="Employment (Class A)"
            icon={Briefcase}
            value={`+${projectedEmploymentContributions.toLocaleString()}`}
          />
          {projectedPensionContributions > 0 && (
            <ContributionRow
              label="Pension drawdown (Class S)"
              icon={Landmark}
              value={`+${projectedPensionContributions.toLocaleString()}`}
            />
          )}
          <div className="border-t border-border/50 pt-1.5 mt-0.5">
            <ContributionRow
              label="Total estimated"
              value={`${totalContributions.toLocaleString()} / ${PRSI_FULL_CONTRIBUTIONS.toLocaleString()}`}
            />
          </div>
        </div>

        {/* Estimated State Pension amount */}
        {status !== 'none' && (
          <div className="rounded-md bg-muted/60 px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Euro className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">Est. State Pension</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums leading-none">
                {formatCurrency(estimatedWeeklyStatePension)}
                <span className="text-xs font-normal text-muted-foreground">/wk</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                {formatCurrency(estimatedAnnualStatePension)}/yr
              </p>
            </div>
          </div>
        )}

        {/* Shortfall note */}
        {status !== 'full' && (
          <p className="text-[11px] text-muted-foreground bg-muted/60 rounded-md px-2.5 py-1.5 leading-snug">
            {status === 'none'
              ? `Need ${(PRSI_MIN_CONTRIBUTIONS - totalContributions).toLocaleString()} more contributions for any entitlement.`
              : `${shortfallToFull.toLocaleString()} contributions short of full rate — approx. ${additionalYearsToFull} more year${additionalYearsToFull !== 1 ? 's' : ''} of PRSI-paying work needed.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

/**
 * Dashboard card showing PRSI contribution count (split by source),
 * eligibility status, and estimated State Pension amount.
 *
 * Only renders when `includeStatePension` is enabled in the store.
 */
export function PRSIContributionCard() {
  const includeStatePension = useProjectionStore(s => s.includeStatePension);
  const fireAge = useProjectionStore(s => s.fireAge);
  const pensionAge = useProjectionStore(s => s.pensionAge);
  const statePensionAge = useProjectionStore(s => s.statePensionAge);
  const statePensionWeeklyAmount = useProjectionStore(s => s.statePensionWeeklyAmount);
  const prsiContributionsToDate = useProjectionStore(s => s.prsiContributionsToDate);
  const careerBreaks = useProjectionStore(s => s.careerBreaks);
  const getCurrentAge = useProjectionStore(s => s.getCurrentAge);

  const currentAge = getCurrentAge();

  if (!includeStatePension || typeof currentAge !== 'number' || typeof fireAge !== 'number') {
    return null;
  }

  const summary = calculatePrsiSummary({
    currentAge,
    fireAge,
    priorContributions: typeof prsiContributionsToDate === 'number' ? prsiContributionsToDate : 0,
    careerBreaks,
    pensionAge: typeof pensionAge === 'number' ? pensionAge : undefined,
    statePensionAge: typeof statePensionAge === 'number' ? statePensionAge : 66,
    statePensionWeeklyAmount: typeof statePensionWeeklyAmount === 'number' ? statePensionWeeklyAmount : 299.30,
  });

  return <PrsiCardContent summary={summary} />;
}
