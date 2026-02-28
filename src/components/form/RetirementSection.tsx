import { Target } from 'lucide-react';
import { FormSection } from './FormSection';
import { NumberField } from './FormField';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectionStore } from '@/store/useProjectionStore';

export function RetirementSection() {
  const fireAge = useProjectionStore(s => s.fireAge);
  const pensionAge = useProjectionStore(s => s.pensionAge);
  const includeStatePension = useProjectionStore(s => s.includeStatePension);
  const statePensionAge = useProjectionStore(s => s.statePensionAge);
  const statePensionWeeklyAmount = useProjectionStore(s => s.statePensionWeeklyAmount);
  const updateField = useProjectionStore(s => s.updateField);
  const validationErrors = useProjectionStore(s => s.validationErrors);

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
              <div className="grid grid-cols-2 gap-3 pt-1">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FormSection>
  );
}
