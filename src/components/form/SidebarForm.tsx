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
  formId?: string;
}

export function SidebarForm({ onCalculated, formId }: SidebarFormProps) {
  const calculate = useProjectionStore(s => s.calculate);
  const validationErrors = useProjectionStore(s => s.validationErrors);
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await calculate();
    if (result.errors.length === 0) {
      onCalculated?.();
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-3">
      <PersonalSection />
      <IncomeSection />
      <AccountsSection />
      <RetirementSection />
      <WithdrawalSection />
      <LumpSumSection />
      <HousePurchaseSection />
      {/* Hidden submit to allow enter-key submission */}
      <button type="submit" className="hidden" aria-hidden="true" disabled={hasValidationErrors} />
    </form>
  );
}
