import { EuroIcon } from 'lucide-react';
import { FormSection } from './FormSection';
import { NumberField } from './FormField';
import { useProjectionStore } from '@/store/useProjectionStore';

export function IncomeSection() {
  const currentSalary = useProjectionStore(s => s.currentSalary);
  const annualSalaryIncrease = useProjectionStore(s => s.annualSalaryIncrease);
  const bonusPercent = useProjectionStore(s => s.bonusPercent);
  const taxBikValue = useProjectionStore(s => s.taxBikValue);
  const updateField = useProjectionStore(s => s.updateField);
  const validationErrors = useProjectionStore(s => s.validationErrors);

  const salaryStr = typeof currentSalary === 'number' ? `€${currentSalary.toLocaleString()}` : '';

  return (
    <FormSection id="income" title="Your Income" icon={EuroIcon} description={salaryStr}>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Annual Salary"
          id="currentSalary"
          value={currentSalary}
          onChange={(v) => updateField('currentSalary', v)}
          prefix="€"
          min={0}
          step={1000}
          placeholder="70000"
          hint="Gross income"
          error={validationErrors.currentSalary}
        />

        <NumberField
          label="Annual Raise"
          id="annualSalaryIncrease"
          value={annualSalaryIncrease}
          onChange={(v) => updateField('annualSalaryIncrease', v)}
          suffix="%"
          min={0}
          max={20}
          step={0.1}
          placeholder="3"
          hint="Year-on-year growth"
          error={validationErrors.annualSalaryIncrease}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Annual Bonus"
          id="bonusPercent"
          value={bonusPercent}
          onChange={(v) => updateField('bonusPercent', v)}
          suffix="%"
          min={0}
          max={100}
          step={0.1}
          placeholder="15"
          hint="% of gross salary"
        />

        <NumberField
          label="Non-Cash Benefits"
          id="taxBikValue"
          value={taxBikValue}
          onChange={(v) => updateField('taxBikValue', v)}
          prefix="€"
          min={0}
          step={100}
          placeholder="1700"
          hint="BIK value"
        />
      </div>
    </FormSection>
  );
}
