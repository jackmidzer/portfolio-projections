import { Home } from 'lucide-react';
import { FormSection } from './FormSection';
import { NumberField, FormField } from './FormField';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectionStore } from '@/store/useProjectionStore';

export function HousePurchaseSection() {
  const enableHouseWithdrawal = useProjectionStore(s => s.enableHouseWithdrawal);
  const houseWithdrawalAge = useProjectionStore(s => s.houseWithdrawalAge);
  const houseDepositFromBrokerageRate = useProjectionStore(s => s.houseDepositFromBrokerageRate);
  const mortgageExemption = useProjectionStore(s => s.mortgageExemption);
  const updateField = useProjectionStore(s => s.updateField);

  const houseBrokerageRate = typeof houseDepositFromBrokerageRate === 'number' ? houseDepositFromBrokerageRate : 50;

  return (
    <FormSection id="housePurchase" title="House Purchase" icon={Home}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="enableHouseWithdrawal" className="text-xs text-muted-foreground cursor-pointer">
            Plan a house purchase
          </Label>
          <Switch
            id="enableHouseWithdrawal"
            checked={enableHouseWithdrawal}
            onCheckedChange={(checked) => updateField('enableHouseWithdrawal', checked)}
          />
        </div>

        <AnimatePresence>
          {enableHouseWithdrawal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="mortgageExemption" className="text-xs text-muted-foreground cursor-pointer">
                    Mortgage Exemption (×4.5)
                  </Label>
                  <Switch
                    id="mortgageExemption"
                    checked={mortgageExemption}
                    onCheckedChange={(checked) => updateField('mortgageExemption', checked)}
                  />
                </div>

                <NumberField
                  label="Purchase Age"
                  id="houseWithdrawalAge"
                  value={houseWithdrawalAge}
                  onChange={(v) => updateField('houseWithdrawalAge', v)}
                  min={18}
                  max={100}
                  placeholder="32"
                />

                <FormField label="Deposit Source Allocation" id="houseAllocation">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-brokerage font-medium">Brokerage {Math.round(houseBrokerageRate)}%</span>
                      <span className="text-savings font-medium">Savings {Math.round(100 - houseBrokerageRate)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={houseBrokerageRate}
                      onChange={(e) => updateField('houseDepositFromBrokerageRate', parseInt(e.target.value))}
                      className="w-full"
                      aria-label="House deposit brokerage allocation"
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
