import { Banknote, Plus, X } from 'lucide-react';
import { FormSection } from './FormSection';
import { NumberField, FormField } from './FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProjectionStore } from '@/store/useProjectionStore';
import type { AccountType, Windfall } from '@/types';

let nextId = 1;

function generateId(): string {
  return `wf-${Date.now()}-${nextId++}`;
}

const ACCOUNT_TYPES: AccountType[] = ['Savings', 'Brokerage', 'Pension'];

const ACCOUNT_LABELS: Record<AccountType, string> = {
  Savings: 'Savings',
  Brokerage: 'Brokerage',
  Pension: 'Pension',
};

const DESTINATION_COLORS: Record<AccountType, string> = {
  Savings: 'text-savings',
  Brokerage: 'text-brokerage',
  Pension: 'text-pension',
};

export function WindfallSection() {
  const windfalls = useProjectionStore(s => s.windfalls);
  const updateField = useProjectionStore(s => s.updateField);
  const validationErrors = useProjectionStore(s => s.validationErrors);

  const addWindfall = () => {
    const currentAge = useProjectionStore.getState().getCurrentAge();
    const defaultAge = typeof currentAge === 'number' ? currentAge + 10 : 40;
    const newWindfall: Windfall = {
      id: generateId(),
      age: defaultAge,
      amount: 50000,
      destination: 'Brokerage',
      label: '',
    };
    updateField('windfalls', [...windfalls, newWindfall]);
  };

  const removeWindfall = (id: string) => {
    updateField('windfalls', windfalls.filter(wf => wf.id !== id));
  };

  const updateWindfall = <K extends keyof Omit<Windfall, 'id'>>(
    id: string,
    field: K,
    value: Windfall[K],
  ) => {
    updateField(
      'windfalls',
      windfalls.map(wf => (wf.id === id ? { ...wf, [field]: value } : wf)),
    );
  };

  return (
    <FormSection id="windfalls" title="Windfalls" icon={Banknote}>
      <div className="space-y-3">
        {windfalls.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            One-off cash injections added to the chosen account in the January of that age.
          </p>
        )}

        {windfalls.map((wf, index) => {
          const ageErr = validationErrors[`windfalls.${index}.age`];
          const amountErr = validationErrors[`windfalls.${index}.amount`];

          return (
            <div key={wf.id} className="relative rounded-md border border-border p-3 space-y-2">
              <button
                type="button"
                onClick={() => removeWindfall(wf.id)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Remove windfall"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="grid grid-cols-2 gap-2 pr-5">
                <NumberField
                  label="Age"
                  id={`wf-age-${wf.id}`}
                  value={wf.age}
                  onChange={(v) => updateWindfall(wf.id, 'age', typeof v === 'number' ? v : wf.age)}
                  min={18}
                  max={100}
                  error={ageErr}
                />
                <NumberField
                  label="Amount (€)"
                  id={`wf-amount-${wf.id}`}
                  value={wf.amount}
                  onChange={(v) => updateWindfall(wf.id, 'amount', typeof v === 'number' ? v : wf.amount)}
                  min={1}
                  placeholder="50000"
                  error={amountErr}
                />
              </div>

              <FormField label="Destination" id={`wf-dest-${wf.id}`}>
                <select
                  id={`wf-dest-${wf.id}`}
                  value={wf.destination}
                  onChange={(e) => updateWindfall(wf.id, 'destination', e.target.value as AccountType)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {ACCOUNT_TYPES.map(type => (
                    <option key={type} value={type}>{ACCOUNT_LABELS[type]}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Description (optional)" id={`wf-label-${wf.id}`}>
                <Input
                  id={`wf-label-${wf.id}`}
                  value={wf.label ?? ''}
                  onChange={(e) => updateWindfall(wf.id, 'label', e.target.value)}
                  placeholder="e.g. Inheritance, Redundancy, Property sale"
                  className="h-9 text-sm"
                  maxLength={60}
                />
              </FormField>

              {!ageErr && !amountErr && (
                <p className={`text-[11px] font-medium ${DESTINATION_COLORS[wf.destination]}`}>
                  €{wf.amount.toLocaleString()} → {wf.destination}{wf.label ? ` (${wf.label})` : ''} at age {wf.age}
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
          onClick={addWindfall}
        >
          <Plus className="h-3.5 w-3.5" />
          Add windfall
        </Button>
      </div>
    </FormSection>
  );
}
