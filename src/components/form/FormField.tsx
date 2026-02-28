import { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  id: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  error?: string;
  children?: ReactNode;
}

export function FormField({ label, id, hint, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={cn("text-xs font-medium", error && "text-destructive")}>
        {label}
      </Label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
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
  error?: string;
}

export function NumberField({
  label, id, value, onChange, hint, prefix, suffix, min, max, step, placeholder, error
}: NumberFieldProps) {
  return (
    <FormField label={label} id={id} hint={hint} error={error}>
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
            suffix && "pr-7",
            error && "border-destructive focus-visible:ring-destructive"
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
