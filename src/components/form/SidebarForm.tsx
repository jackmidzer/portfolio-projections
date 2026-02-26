import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectionStore } from '@/store/useProjectionStore';
import { PersonalSection } from './PersonalSection';
import { IncomeSection } from './IncomeSection';
import { AccountsSection } from './AccountsSection';
import { RetirementSection } from './RetirementSection';
import { WithdrawalSection } from './WithdrawalSection';
import { LumpSumSection } from './LumpSumSection';
import { HousePurchaseSection } from './HousePurchaseSection';

interface SidebarFormProps {
  onCalculated?: () => void;
}

export function SidebarForm({ onCalculated }: SidebarFormProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const calculate = useProjectionStore(s => s.calculate);
  const resetForm = useProjectionStore(s => s.resetForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = calculate();
    setErrors(result.errors);
    if (result.errors.length === 0) {
      onCalculated?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PersonalSection />
      <IncomeSection />
      <AccountsSection />
      <RetirementSection />
      <WithdrawalSection />
      <LumpSumSection />
      <HousePurchaseSection />

      {/* Errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                {errors.length} {errors.length === 1 ? 'issue' : 'issues'} found
              </span>
            </div>
            <ul className="space-y-1">
              {errors.map((error, idx) => (
                <li key={idx} className="text-xs text-destructive/90 flex items-start gap-1.5">
                  <span className="mt-0.5">•</span>
                  {error}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" size="sm">
          <Calculator className="h-4 w-4 mr-2" />
          Calculate
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setErrors([]);
          }}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
