import { Target } from 'lucide-react';
import { FormSection } from './FormSection';
import { NumberField } from './FormField';
import { useProjectionStore } from '@/store/useProjectionStore';

export function RetirementSection() {
  const fireAge = useProjectionStore(s => s.fireAge);
  const pensionAge = useProjectionStore(s => s.pensionAge);
  const updateField = useProjectionStore(s => s.updateField);

  return (
    <FormSection id="retirement" title="Retirement Planning" icon={Target}>
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
        />
      </div>
    </FormSection>
  );
}
