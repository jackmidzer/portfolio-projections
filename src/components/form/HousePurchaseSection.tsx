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
  const baseHousePrice = useProjectionStore(s => s.baseHousePrice);
  const houseAnnualPriceIncrease = useProjectionStore(s => s.houseAnnualPriceIncrease);
  const mortgageInterestRate = useProjectionStore(s => s.mortgageInterestRate);
  const mortgageTerm = useProjectionStore(s => s.mortgageTerm);
  const updateField = useProjectionStore(s => s.updateField);
  const validationErrors = useProjectionStore(s => s.validationErrors);

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
                <NumberField
                  label="Estimated House Price"
                  id="baseHousePrice"
                  value={baseHousePrice}
                  onChange={(v) => updateField('baseHousePrice', v === '' ? 0 : Math.max(1, v))}
                  prefix="€"
                  min={1}
                  step={1}
                  placeholder="387000"
                />

                <NumberField
                  label="Annual Price Increase"
                  id="houseAnnualPriceIncrease"
                  value={houseAnnualPriceIncrease}
                  onChange={(v) => updateField('houseAnnualPriceIncrease', v === '' ? 0 : Math.min(20, Math.max(0, v)))}
                  suffix="%"
                  min={0}
                  max={20}
                  step={0.1}
                  placeholder="7"
                />

                <NumberField
                  label="Mortgage Interest Rate"
                  id="mortgageInterestRate"
                  value={mortgageInterestRate}
                  onChange={(v) => updateField('mortgageInterestRate', v === '' ? 0 : Math.min(15, Math.max(0, v)))}
                  suffix="%"
                  min={0}
                  max={15}
                  step={0.1}
                  placeholder="4.0"
                />

                <NumberField
                  label="Mortgage Term"
                  id="mortgageTerm"
                  value={mortgageTerm}
                  onChange={(v) => updateField('mortgageTerm', v === '' ? 0 : Math.min(40, Math.max(1, typeof v === 'number' ? v : 30)))}
                  suffix="yrs"
                  min={1}
                  max={40}
                  step={1}
                  placeholder="30"
                />

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
                  error={validationErrors.houseWithdrawalAge}
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
