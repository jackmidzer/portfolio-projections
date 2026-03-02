import { Target, ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';
import { FormSection } from './FormSection';
import { NumberField } from './FormField';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectionStore } from '@/store/useProjectionStore';
import { calculatePrsiSummary, PRSI_MIN_CONTRIBUTIONS, PRSI_FULL_CONTRIBUTIONS } from '@/utils/taxCalculations';
import type { PrsiSummary } from '@/utils/taxCalculations';

// ─── PRSI eligibility inline indicator ───────────────────────────────────────

function PrsiIndicator({ summary }: { summary: PrsiSummary }) {
  const { status, totalContributions, additionalYearsToFull, percentOfFull, estimatedWeeklyStatePension } = summary;

  const config = {
    full: {
      Icon: ShieldCheck,
      borderCls: 'border-emerald-500/30 bg-emerald-500/10',
      iconCls: 'text-emerald-500',
      textCls: 'text-emerald-600 dark:text-emerald-400',
      label: 'Full State Pension',
      detail: `${totalContributions.toLocaleString()} contributions — qualifies for full rate. Est. €${estimatedWeeklyStatePension.toFixed(2)}/wk.`,
    },
    partial: {
      Icon: ShieldAlert,
      borderCls: 'border-amber-500/30 bg-amber-500/10',
      iconCls: 'text-amber-500',
      textCls: 'text-amber-600 dark:text-amber-400',
      label: 'Partial State Pension',
      detail: `${totalContributions.toLocaleString()} of ${PRSI_FULL_CONTRIBUTIONS.toLocaleString()} contributions — est. €${estimatedWeeklyStatePension.toFixed(2)}/wk. +${additionalYearsToFull} yr${additionalYearsToFull !== 1 ? 's' : ''} work for full rate.`,
    },
    none: {
      Icon: ShieldOff,
      borderCls: 'border-destructive/30 bg-destructive/10',
      iconCls: 'text-destructive',
      textCls: 'text-destructive',
      label: 'No Entitlement',
      detail: `Only ${totalContributions.toLocaleString()} contributions — ${PRSI_MIN_CONTRIBUTIONS.toLocaleString()} minimum needed for any pension.`,
    },
  } as const;

  const c = config[status];
  const { Icon } = c;

  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${c.borderCls}`}>
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${c.iconCls}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs font-semibold leading-none ${c.textCls}`}>{c.label}</p>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">{percentOfFull}%</span>
        </div>
        {/* Progress bar */}
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              status === 'full' ? 'bg-emerald-500' : status === 'partial' ? 'bg-amber-500' : 'bg-destructive'
            }`}
            style={{ width: `${percentOfFull}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{c.detail}</p>
      </div>
    </div>
  );
}

export function RetirementSection() {
  const fireAge = useProjectionStore(s => s.fireAge);
  const pensionAge = useProjectionStore(s => s.pensionAge);
  const includeStatePension = useProjectionStore(s => s.includeStatePension);
  const statePensionAge = useProjectionStore(s => s.statePensionAge);
  const statePensionWeeklyAmount = useProjectionStore(s => s.statePensionWeeklyAmount);
  const prsiContributionsToDate = useProjectionStore(s => s.prsiContributionsToDate);
  const careerBreaks = useProjectionStore(s => s.careerBreaks);
  const getCurrentAge = useProjectionStore(s => s.getCurrentAge);
  const updateField = useProjectionStore(s => s.updateField);
  const validationErrors = useProjectionStore(s => s.validationErrors);

  // Live PRSI contribution estimate (only when State Pension is enabled)
  const currentAge = getCurrentAge();
  const prsiSummary = includeStatePension && typeof currentAge === 'number' && typeof fireAge === 'number'
    ? calculatePrsiSummary({
        currentAge,
        fireAge,
        priorContributions: typeof prsiContributionsToDate === 'number' ? prsiContributionsToDate : 0,
        careerBreaks,
        pensionAge: typeof pensionAge === 'number' ? pensionAge : undefined,
        statePensionAge: typeof statePensionAge === 'number' ? statePensionAge : 66,
        statePensionWeeklyAmount: typeof statePensionWeeklyAmount === 'number' ? statePensionWeeklyAmount : 299.30,
      })
    : null;

  return (
    <FormSection id="retirement" title="Retirement Planning" icon={Target}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="FIRE Age"
            id="fireAge"
            value={fireAge}
            onChange={(v) => updateField('fireAge', v)}
            min={18}
            max={100}
            placeholder="50"
            hint="Start living off investments"
            error={validationErrors.fireAge}
          />

          <NumberField
            label="Pension Drawdown Age"
            id="pensionAge"
            value={pensionAge}
            onChange={(v) => updateField('pensionAge', v)}
            min={18}
            max={100}
            placeholder="66"
            hint="Start drawing pension"
            error={validationErrors.pensionAge}
          />
        </div>

        {/* Irish State Pension */}
        <div className="flex items-center justify-between pt-1">
          <Label htmlFor="includeStatePension" className="text-xs text-muted-foreground cursor-pointer">
            Include Irish state pension
          </Label>
          <Switch
            id="includeStatePension"
            checked={includeStatePension}
            onCheckedChange={(checked) => updateField('includeStatePension', checked)}
          />
        </div>

        <AnimatePresence>
          {includeStatePension && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="State Pension Age"
                    id="statePensionAge"
                    value={statePensionAge}
                    onChange={(v) => updateField('statePensionAge', v)}
                    min={60}
                    max={70}
                    placeholder="66"
                    hint="Eligibility age (default 66)"
                  />
                  <NumberField
                    label="Weekly Amount (€)"
                    id="statePensionWeeklyAmount"
                    value={statePensionWeeklyAmount}
                    onChange={(v) => updateField('statePensionWeeklyAmount', v)}
                    min={0}
                    step={0.01}
                    placeholder="299.30"
                    hint="~€15,564/yr at €299.30/wk"
                  />
                </div>

                {/* PRSI contributions already paid */}
                <NumberField
                  label="Existing PRSI Contributions"
                  id="prsiContributionsToDate"
                  value={prsiContributionsToDate}
                  onChange={(v) => updateField('prsiContributionsToDate', v)}
                  min={0}
                  max={PRSI_FULL_CONTRIBUTIONS}
                  placeholder="208"
                  hint={`Weeks already paid (${PRSI_FULL_CONTRIBUTIONS} = full rate)`}
                />

                {/* Live PRSI eligibility indicator */}
                {prsiSummary && (
                  <PrsiIndicator summary={prsiSummary} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FormSection>
  );
}
