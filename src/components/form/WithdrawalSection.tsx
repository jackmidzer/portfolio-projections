import { Wallet } from 'lucide-react';
import { FormSection } from './FormSection';
import { NumberField } from './FormField';
import { useProjectionStore } from '@/store/useProjectionStore';

export function WithdrawalSection() {
  const salaryReplacementRate = useProjectionStore(s => s.salaryReplacementRate);
  const withdrawalRate = useProjectionStore(s => s.withdrawalRate);
  const updateField = useProjectionStore(s => s.updateField);
  const validationErrors = useProjectionStore(s => s.validationErrors);

  return (
    <FormSection id="withdrawal" title="Retirement Income" icon={Wallet}>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Salary Replacement"
          id="salaryReplacementRate"
          value={salaryReplacementRate}
          onChange={(v) => updateField('salaryReplacementRate', v)}
          suffix="%"
          min={0}
          max={100}
          step={0.1}
          placeholder="80"
          hint="% of final salary to live on"
          error={validationErrors.salaryReplacementRate}
        />

        <NumberField
          label="Pension Withdrawal"
          id="withdrawalRate"
          value={withdrawalRate}
          onChange={(v) => updateField('withdrawalRate', v)}
          suffix="%"
          min={0}
          max={20}
          step={0.1}
          placeholder="4"
          hint="Annual pension drawdown %"
          error={validationErrors.withdrawalRate}
        />
      </div>
    </FormSection>
  );
}
