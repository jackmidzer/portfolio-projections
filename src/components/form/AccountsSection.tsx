import { useState } from 'react';
import { PieChart, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormSection } from './FormSection';
import { NumberField, FormField } from './FormField';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useProjectionStore } from '@/store/useProjectionStore';
import { AccountInput as AccountInputType, AccountType, AgeBracketContributions, EmployerAgeBracketContributions } from '@/types';
import { cn } from '@/lib/utils';

const accountMeta: Record<AccountType, { color: string; borderColor: string; bgColor: string }> = {
  Savings: { color: 'text-savings', borderColor: 'border-l-savings', bgColor: 'bg-savings-muted' },
  Pension: { color: 'text-pension', borderColor: 'border-l-pension', bgColor: 'bg-pension-muted' },
  Brokerage: { color: 'text-brokerage', borderColor: 'border-l-brokerage', bgColor: 'bg-brokerage-muted' },
};

function AccountCard({ account, onChange, errors = {} }: {
  account: AccountInputType;
  onChange: (a: AccountInputType) => void;
  errors?: { currentBalance?: string; expectedReturn?: string };
}) {
  const [showBrackets, setShowBrackets] = useState(false);
  const meta = accountMeta[account.name];
  const isPensionWithBrackets = account.name === 'Pension' && account.ageBracketContributions;

  const handleChange = (field: keyof Omit<AccountInputType, 'name'>, value: string) => {
    if (value === 'age-bracket') {
      onChange({ ...account, [field]: 'age-bracket' });
    } else {
      onChange({ ...account, [field]: parseFloat(value) || 0 });
    }
  };

  const handleBracketChange = (bracket: keyof AgeBracketContributions, value: string) => {
    if (account.ageBracketContributions) {
      onChange({
        ...account,
        ageBracketContributions: { ...account.ageBracketContributions, [bracket]: parseFloat(value) || 0 },
      });
    }
  };

  const [showEmployerBrackets, setShowEmployerBrackets] = useState(false);

  const handleEmployerBracketChange = (bracket: keyof EmployerAgeBracketContributions, value: string) => {
    if (account.employerAgeBracketContributions) {
      onChange({
        ...account,
        employerAgeBracketContributions: { ...account.employerAgeBracketContributions, [bracket]: parseFloat(value) || 0 },
      });
    }
  };

  return (
    <div className={cn("rounded-lg border border-l-4 p-3 space-y-3", meta.borderColor)}>
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-semibold", meta.color)}>{account.name}</span>
      </div>

      <NumberField
        label="Balance"
        id={`${account.name}-balance`}
        value={account.currentBalance}
        onChange={(v) => handleChange('currentBalance', String(v))}
        prefix="€"
        min={0}
        step={100}
        placeholder="0"
        error={errors.currentBalance}
      />

      {!isPensionWithBrackets && (
        <NumberField
          label={account.isSalaryPercentage ? 'Contribution (% salary)' : 'Monthly Contribution'}
          id={`${account.name}-contribution`}
          value={account.monthlyContribution}
          onChange={(v) => handleChange('monthlyContribution', String(v))}
          suffix={account.isSalaryPercentage ? '%' : undefined}
          prefix={!account.isSalaryPercentage ? '€' : undefined}
          min={0}
          step={account.isSalaryPercentage ? 0.1 : 10}
          hint={account.isSalaryPercentage ? (account.name === 'Pension' ? '% of gross salary' : '% of net salary') : 'Fixed monthly'}
        />
      )}

      {isPensionWithBrackets && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowBrackets(!showBrackets)}
            className="flex items-center justify-between w-full text-xs font-medium text-pension hover:text-pension/80 transition-colors"
          >
            <span>Age Bracket Contributions</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showBrackets && "rotate-180")} />
          </button>
          <AnimatePresence>
            {showBrackets && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-2 border-t">
                  {([
                    ['under30', 'Under 30'],
                    ['age30to39', '30–39'],
                    ['age40to49', '40–49'],
                    ['age50to54', '50–54'],
                    ['age55to59', '55–59'],
                    ['age60plus', '60+'],
                  ] as const).map(([bracket, label]) => (
                    <div key={bracket} className="flex items-center gap-2">
                      <Label className="text-[11px] text-muted-foreground w-16 flex-shrink-0">{label}</Label>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={account.ageBracketContributions?.[bracket] || ''}
                          onChange={(e) => handleBracketChange(bracket, e.target.value)}
                          className="h-8 text-xs pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {isPensionWithBrackets && account.employerAgeBracketContributions && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowEmployerBrackets(!showEmployerBrackets)}
            className="flex items-center justify-between w-full text-xs font-medium text-pension hover:text-pension/80 transition-colors"
          >
            <span>Employer Age Bracket Contributions</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showEmployerBrackets && "rotate-180")} />
          </button>
          <AnimatePresence>
            {showEmployerBrackets && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-2 border-t">
                  {([
                    ['under25', 'Under 25'],
                    ['age25to29', '25–29'],
                    ['age30to34', '30–34'],
                    ['age35to39', '35–39'],
                    ['age40to44', '40–44'],
                    ['age45to49', '45–49'],
                    ['age50to54', '50–54'],
                    ['age55plus', '55+'],
                  ] as const).map(([bracket, label]) => (
                    <div key={bracket} className="flex items-center gap-2">
                      <Label className="text-[11px] text-muted-foreground w-16 flex-shrink-0">{label}</Label>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={account.employerAgeBracketContributions?.[bracket] || ''}
                          onChange={(e) => handleEmployerBracketChange(bracket, e.target.value)}
                          className="h-8 text-xs pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <NumberField
        label="Expected Growth"
        id={`${account.name}-return`}
        value={account.expectedReturn}
        onChange={(v) => handleChange('expectedReturn', String(v))}
        suffix="%"
        min={0}
        max={100}
        step={0.1}
        error={errors.expectedReturn}
      />

      {isPensionWithBrackets ? (
        <FormField label="Bonus Contribution" id={`${account.name}-bonus`}>
          <div className="flex items-center gap-2">
            <Switch
              checked={account.bonusContributionPercent === 'age-bracket'}
              onCheckedChange={(checked) => handleChange('bonusContributionPercent', checked ? 'age-bracket' : '0')}
            />
            <span className="text-xs text-muted-foreground">Use age brackets</span>
          </div>
        </FormField>
      ) : (
        <NumberField
          label="Bonus Contribution"
          id={`${account.name}-bonus`}
          value={typeof account.bonusContributionPercent === 'number' ? account.bonusContributionPercent : 0}
          onChange={(v) => handleChange('bonusContributionPercent', String(v))}
          suffix="%"
          min={0}
          max={100}
          step={0.1}
          hint={account.name === 'Pension' ? '% of gross bonus' : '% of net bonus'}
        />
      )}
    </div>
  );
}

export function AccountsSection() {
  const accounts = useProjectionStore(s => s.accounts);
  const updateAccount = useProjectionStore(s => s.updateAccount);
  const validationErrors = useProjectionStore(s => s.validationErrors);

  return (
    <FormSection id="accounts" title="Your Investments" icon={PieChart}>
      <div className="space-y-3">
        {accounts.map((account, index) => (
          <AccountCard
            key={account.name}
            account={account}
            onChange={(updated) => updateAccount(index, updated)}
            errors={{
              currentBalance: validationErrors[`accounts.${index}.currentBalance`],
              expectedReturn: validationErrors[`accounts.${index}.expectedReturn`],
            }}
          />
        ))}
      </div>
    </FormSection>
  );
}
