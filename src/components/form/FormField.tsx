import { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  id: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  children?: ReactNode;
}

export function FormField({ label, id, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {children}
      {hint && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  id: string;
  value: number | '';
  onChange: (value: number | '') => void;
  hint?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number | string;
  placeholder?: string;
}

export function NumberField({
  label, id, value, onChange, hint, prefix, suffix, min, max, step, placeholder
}: NumberFieldProps) {
  return (
    <FormField label={label} id={id} hint={hint}>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          id={id}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
          className={cn(
            "h-9 text-sm",
            prefix && "pl-7",
            suffix && "pr-7"
          )}
          placeholder={placeholder}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </FormField>
  );
}
