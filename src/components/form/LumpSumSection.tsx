import { Landmark } from 'lucide-react';
import { FormSection } from './FormSection';
import { NumberField, FormField } from './FormField';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectionStore } from '@/store/useProjectionStore';

export function LumpSumSection() {
  const enablePensionLumpSum = useProjectionStore(s => s.enablePensionLumpSum);
  const pensionLumpSumAge = useProjectionStore(s => s.pensionLumpSumAge);
  const pensionLumpSumMaxAmount = useProjectionStore(s => s.pensionLumpSumMaxAmount);
  const lumpSumToBrokerageRate = useProjectionStore(s => s.lumpSumToBrokerageRate);
  const pensionAge = useProjectionStore(s => s.pensionAge);
  const updateField = useProjectionStore(s => s.updateField);

  const brokerageRate = typeof lumpSumToBrokerageRate === 'number' ? lumpSumToBrokerageRate : 80;

  return (
    <FormSection id="lumpSum" title="Pension Lump Sum" icon={Landmark}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="enablePensionLumpSum" className="text-xs text-muted-foreground cursor-pointer">
            Take pension lump sum
          </Label>
          <Switch
            id="enablePensionLumpSum"
            checked={enablePensionLumpSum}
            onCheckedChange={(checked) => updateField('enablePensionLumpSum', checked)}
          />
        </div>

        <AnimatePresence>
          {enablePensionLumpSum && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-2">
                <NumberField
                  label="Max Lump Sum (€)"
                  id="pensionLumpSumMaxAmount"
                  value={pensionLumpSumMaxAmount}
                  onChange={(v) => updateField('pensionLumpSumMaxAmount', v)}
                  min={1}
                  placeholder="200000"
                  hint="Cap on amount taken (25% of balance if lower)"
                />

                <NumberField
                  label="Lump Sum Age"
                  id="pensionLumpSumAge"
                  value={pensionLumpSumAge}
                  onChange={(v) => updateField('pensionLumpSumAge', v)}
                  min={50}
                  max={typeof pensionAge === 'number' ? pensionAge : 100}
                  placeholder="50"
                  hint="Min 50, max pension age"
                />

                <FormField label="Lump Sum Allocation" id="lumpSumAllocation">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-brokerage font-medium">Brokerage {Math.round(brokerageRate)}%</span>
                      <span className="text-savings font-medium">Savings {Math.round(100 - brokerageRate)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={brokerageRate}
                      onChange={(e) => updateField('lumpSumToBrokerageRate', parseInt(e.target.value))}
                      className="w-full"
                      aria-label="Lump sum brokerage allocation"
                    />
                  </div>
                </FormField>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FormSection>
  );
}
