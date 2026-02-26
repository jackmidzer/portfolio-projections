import { User } from 'lucide-react';
import { FormSection } from './FormSection';
import { FormField, NumberField } from './FormField';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProjectionStore } from '@/store/useProjectionStore';

export function PersonalSection() {
  const dateOfBirth = useProjectionStore(s => s.dateOfBirth);
  const targetAge = useProjectionStore(s => s.targetAge);
  const updateField = useProjectionStore(s => s.updateField);
  const getCurrentAge = useProjectionStore(s => s.getCurrentAge);
  const getMonthsUntilBirthday = useProjectionStore(s => s.getMonthsUntilBirthday);

  const currentAge = getCurrentAge();
  const monthsUntilBirthday = getMonthsUntilBirthday();
  const timeHorizon = typeof targetAge === 'number' && typeof currentAge === 'number' && targetAge > currentAge
    ? targetAge - currentAge
    : null;

  return (
    <FormSection id="personal" title="Your Details" icon={User} description={typeof currentAge === 'number' ? `Age ${currentAge}` : undefined}>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Date of Birth" id="dateOfBirth">
          <Input
            type="date"
            id="dateOfBirth"
            value={dateOfBirth}
            onChange={(e) => updateField('dateOfBirth', e.target.value)}
            className="h-9 text-sm"
            max={new Date().toISOString().split('T')[0]}
          />
        </FormField>

        <NumberField
          label="Plan Until Age"
          id="targetAge"
          value={targetAge}
          onChange={(v) => updateField('targetAge', v)}
          min={19}
          max={150}
          placeholder="75"
        />
      </div>

      {typeof currentAge === 'number' && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Age {currentAge}</Badge>
          {monthsUntilBirthday > 0 && (
            <Badge variant="outline">{monthsUntilBirthday}mo to birthday</Badge>
          )}
          {timeHorizon && (
            <Badge variant="outline">{timeHorizon}yr horizon</Badge>
          )}
        </div>
      )}
    </FormSection>
  );
}
