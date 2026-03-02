import { Briefcase, Plus, X } from 'lucide-react';
import { FormSection } from './FormSection';
import { NumberField } from './FormField';
import { Button } from '@/components/ui/button';
import { useProjectionStore } from '@/store/useProjectionStore';
import type { CareerBreak } from '@/types';

let nextId = 1;

function generateId(): string {
  return `cb-${Date.now()}-${nextId++}`;
}

export function CareerBreaksSection() {
  const careerBreaks = useProjectionStore(s => s.careerBreaks);
  const updateField = useProjectionStore(s => s.updateField);
  const validationErrors = useProjectionStore(s => s.validationErrors);

  const addBreak = () => {
    const currentAge = useProjectionStore.getState().getCurrentAge();
    const from = typeof currentAge === 'number' ? currentAge + 5 : 35;
    const newBreak: CareerBreak = {
      id: generateId(),
      fromAge: from,
      toAge: from + 1,
      salaryPercent: 0,
    };
    updateField('careerBreaks', [...careerBreaks, newBreak]);
  };

  const removeBreak = (id: string) => {
    updateField('careerBreaks', careerBreaks.filter(cb => cb.id !== id));
  };

  const updateBreak = (id: string, field: keyof Omit<CareerBreak, 'id'>, value: number) => {
    updateField(
      'careerBreaks',
      careerBreaks.map(cb => (cb.id === id ? { ...cb, [field]: value } : cb)),
    );
  };

  return (
    <FormSection id="careerBreaks" title="Career Breaks" icon={Briefcase}>
      <div className="space-y-3">
        {careerBreaks.map((cb, index) => {
          const fromErr = validationErrors[`careerBreaks.${index}.fromAge`];
          const toErr = validationErrors[`careerBreaks.${index}.toAge`];
          const salaryErr = validationErrors[`careerBreaks.${index}.salaryPercent`];
          const overlapErr = validationErrors[`careerBreaks.${index}.overlap`];
          const anyError = fromErr || toErr || salaryErr || overlapErr;

          return (
            <div key={cb.id} className="relative rounded-md border border-border p-3 space-y-2">
              <button
                type="button"
                onClick={() => removeBreak(cb.id)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Remove break"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="grid grid-cols-3 gap-2 pr-5">
                <NumberField
                  label="From Age"
                  id={`cb-from-${cb.id}`}
                  value={cb.fromAge}
                  onChange={(v) => updateBreak(cb.id, 'fromAge', typeof v === 'number' ? v : cb.fromAge)}
                  min={18}
                  max={100}
                  error={fromErr}
                />
                <NumberField
                  label="To Age"
                  id={`cb-to-${cb.id}`}
                  value={cb.toAge}
                  onChange={(v) => updateBreak(cb.id, 'toAge', typeof v === 'number' ? v : cb.toAge)}
                  min={18}
                  max={100}
                  error={toErr}
                />
                <NumberField
                  label="Salary %"
                  id={`cb-pct-${cb.id}`}
                  value={cb.salaryPercent}
                  onChange={(v) => updateBreak(cb.id, 'salaryPercent', typeof v === 'number' ? v : cb.salaryPercent)}
                  min={0}
                  max={100}
                  suffix="%"
                  error={salaryErr}
                />
              </div>
              {overlapErr && (
                <p className="text-[11px] text-destructive">{overlapErr}</p>
              )}
              {!anyError && (
                <p className="text-[11px] text-muted-foreground">
                  {cb.salaryPercent === 0
                    ? `Full career break age ${cb.fromAge}–${cb.toAge}`
                    : `${cb.salaryPercent}% salary age ${cb.fromAge}–${cb.toAge}`}
                </p>
              )}
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={addBreak}
        >
          <Plus className="h-3.5 w-3.5" />
          Add break
        </Button>
      </div>
    </FormSection>
  );
}
