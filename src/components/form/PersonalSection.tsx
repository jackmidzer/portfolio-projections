import { User } from 'lucide-react';
import { FormSection } from './FormSection';
import { FormField, NumberField } from './FormField';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useProjectionStore } from '@/store/useProjectionStore';
import { cn } from '@/lib/utils';

export function PersonalSection() {
  const dateOfBirth = useProjectionStore(s => s.dateOfBirth);
  const targetAge = useProjectionStore(s => s.targetAge);
  const inflationRate = useProjectionStore(s => s.inflationRate);
  const taxBandIndexation = useProjectionStore(s => s.taxBandIndexation);
  const claimRentRelief = useProjectionStore(s => s.claimRentRelief);
  const claimMedicalInsurance = useProjectionStore(s => s.claimMedicalInsurance);
  const updateField = useProjectionStore(s => s.updateField);
  const getCurrentAge = useProjectionStore(s => s.getCurrentAge);
  const getMonthsUntilBirthday = useProjectionStore(s => s.getMonthsUntilBirthday);
  const validationErrors = useProjectionStore(s => s.validationErrors);

  const currentAge = getCurrentAge();
  const monthsUntilBirthday = getMonthsUntilBirthday();
  const timeHorizon = typeof targetAge === 'number' && typeof currentAge === 'number' && targetAge > currentAge
    ? targetAge - currentAge
    : null;

  return (
    <FormSection id="personal" title="Your Details" icon={User} description={typeof currentAge === 'number' ? `Age ${currentAge}` : undefined}>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Date of Birth" id="dateOfBirth" error={validationErrors.dateOfBirth}>
          <Input
            type="date"
            id="dateOfBirth"
            value={dateOfBirth}
            onChange={(e) => updateField('dateOfBirth', e.target.value)}
            className={cn("h-9 text-sm", validationErrors.dateOfBirth && "border-destructive focus-visible:ring-destructive")}
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
          error={validationErrors.targetAge}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Inflation Rate"
          id="inflationRate"
          value={inflationRate}
          onChange={(v) => updateField('inflationRate', v)}
          min={0}
          max={20}
          step={0.1}
          suffix="%"
          placeholder="2.5"
        />

        <NumberField
          label="Tax Band Growth"
          id="taxBandIndexation"
          value={taxBandIndexation}
          onChange={(v) => updateField('taxBandIndexation', v)}
          min={0}
          max={10}
          step={0.1}
          suffix="%"
          placeholder="1.5"
          hint="Annual threshold uplift"
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

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tax Credits</p>
        <div className="flex items-center justify-between">
          <Label htmlFor="claimRentRelief" className="text-xs text-muted-foreground cursor-pointer leading-snug">
            Rent Relief Credit <span className="text-muted-foreground/60">(€1,000 — renters only)</span>
          </Label>
          <Switch
            id="claimRentRelief"
            checked={claimRentRelief}
            onCheckedChange={(checked) => updateField('claimRentRelief', checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="claimMedicalInsurance" className="text-xs text-muted-foreground cursor-pointer leading-snug">
            Medical Insurance Credit <span className="text-muted-foreground/60">(€200 — VHI / private health)</span>
          </Label>
          <Switch
            id="claimMedicalInsurance"
            checked={claimMedicalInsurance}
            onCheckedChange={(checked) => updateField('claimMedicalInsurance', checked)}
          />
        </div>
      </div>
    </FormSection>
  );
}
