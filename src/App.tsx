import { useState, lazy, Suspense } from 'react';
import InputForm from './components/InputForm';
import AccountSummary from './components/AccountSummary';
import MilestoneSummary from './components/MilestoneSummary';
import ResultsTable from './components/ResultsTable';
import TaxSummary from './components/TaxSummary';
import HouseDepositSummary from './components/HouseDepositSummary';
import { PortfolioInputs, PortfolioResults, TaxCalculationResult } from './types';
import { calculatePortfolioGrowth } from './utils/calculations';
import { calculateNetSalary, calculateBonusTaxBurden } from './utils/taxCalculations';

const PortfolioChart = lazy(() => import('./components/PortfolioChart'));

function App() {
  const [results, setResults] = useState<PortfolioResults | null>(null);
  const [taxCalculationResult, setTaxCalculationResult] = useState<TaxCalculationResult | null>(null);
  const [bonusTaxBurden, setBonusTaxBurden] = useState<number>(0);
  const [bonusPercent, setBonusPercent] = useState<number>(0);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [taxBreakdownExpanded, setTaxBreakdownExpanded] = useState<boolean>(false);

  // Helper function to get pension contribution percentage based on age brackets
  const getPensionPercentForAge = (age: number, accounts: PortfolioInputs['accounts']): number => {
    const pensionAccount = accounts.find(acc => acc.name === 'Pension');
    if (!pensionAccount || !pensionAccount.ageBracketContributions) {
      return 0;
    }
    const brackets = pensionAccount.ageBracketContributions;
    if (age < 30) return brackets.under30;
    if (age < 40) return brackets.age30to39;
    if (age < 50) return brackets.age40to49;
    if (age < 55) return brackets.age50to54;
    if (age < 60) return brackets.age55to59;
    return brackets.age60plus;
  };

  const handleCalculate = (inputs: PortfolioInputs) => {
    const timeHorizon = inputs.targetAge - inputs.currentAge + 1;
    const calculatedResults = calculatePortfolioGrowth(
      inputs.accounts,
      timeHorizon,
      inputs.currentAge,
      inputs.currentSalary,
      inputs.annualSalaryIncrease,
      inputs.monthsUntilNextBirthday,
      inputs.dateOfBirth,
      inputs.pensionAge,
      inputs.withdrawalRate,
      inputs.earlyRetirementAge,
      inputs.salaryReplacementRate,
      inputs.lumpSumToBrokerageRate,
      inputs.bonusPercent,
      inputs.houseWithdrawalAge,
      inputs.enableHouseWithdrawal,
      inputs.houseDepositCalculation,
      inputs.houseDepositFromBrokerageRate,
      inputs.enablePensionLumpSum,
      inputs.taxInputs,
      inputs.pensionLumpSumAge,
      inputs.mortgageExemption
    );
    setResults(calculatedResults);
    setBonusPercent(inputs.bonusPercent);
    
    // Calculate tax result if tax inputs are provided
    if (inputs.taxInputs) {
      const taxResult = calculateNetSalary(inputs.taxInputs);
      setTaxCalculationResult(taxResult);
      
      // Calculate bonus tax burden if bonus exists
      if (inputs.bonusPercent > 0) {
        const bonus = inputs.bonusPercent;
        const pensionPercent = inputs.accounts.find(acc => acc.name === 'Pension')?.ageBracketContributions ? 
          getPensionPercentForAge(inputs.currentAge, inputs.accounts) : 0;
        const bonusTax = calculateBonusTaxBurden(
          inputs.currentSalary,
          bonus,
          pensionPercent,
          inputs.taxInputs.bikValue
        );
        setBonusTaxBurden(bonusTax);
      } else {
        setBonusTaxBurden(0);
      }
    } else {
      setTaxCalculationResult(null);
      setBonusTaxBurden(0);
    }
    
    // Scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="inline-block mb-4">
            <div className="text-5xl mb-3">📈</div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-4 tracking-tight">
            Wealth Projection Calculator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            See how your investments could grow over time. Plan for retirement, track your savings, and understand the impact of your financial decisions.
          </p>
        </header>

        {/* Input Form */}
        <div className="mb-16">
          <InputForm onCalculate={handleCalculate} />
        </div>

        {/* Results Section */}
        {results && (
          <div id="results" className="space-y-12">
            <div className="pt-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <span>📊</span> Your Results
              </h2>
            </div>
            <AccountSummary results={results} />
            
            {results.houseDepositCalculation && typeof results.houseWithdrawalAge === 'number' && (
              <HouseDepositSummary
                age={results.houseWithdrawalAge}
                houseMetrics={results.houseDepositCalculation}
                mortgageExemption={results.mortgageExemption}
              />
            )}
            
            {results.houseWithdrawalAgeSnapshot && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => {
                    const newSet = new Set(expandedMilestones);
                    if (newSet.has('house-purchase')) {
                      newSet.delete('house-purchase');
                    } else {
                      newSet.add('house-purchase');
                    }
                    setExpandedMilestones(newSet);
                  }}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-bold text-gray-900">Your Financial Position After House Purchase</h3>
                  <span className={`text-xl transition-transform ${expandedMilestones.has('house-purchase') ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedMilestones.has('house-purchase') && (
                  <div className="px-6 pb-6 border-t border-gray-200">
                    <MilestoneSummary 
                      snapshot={results.houseWithdrawalAgeSnapshot} 
                      title="Your Financial Position After House Purchase" 
                      ageLabel="House Purchase"
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Milestone Summaries */}
            {results.earlyRetirementSnapshot && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => {
                    const newSet = new Set(expandedMilestones);
                    if (newSet.has('early-retirement')) {
                      newSet.delete('early-retirement');
                    } else {
                      newSet.add('early-retirement');
                    }
                    setExpandedMilestones(newSet);
                  }}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-bold text-gray-900">Your Financial Position at Early Retirement</h3>
                  <span className={`text-xl transition-transform ${expandedMilestones.has('early-retirement') ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedMilestones.has('early-retirement') && (
                  <div className="px-6 pb-6 border-t border-gray-200">
                    <MilestoneSummary 
                      snapshot={results.earlyRetirementSnapshot} 
                      title="Your Financial Position at Early Retirement" 
                      ageLabel="Early Retirement"
                    />
                  </div>
                )}
              </div>
            )}
            
            {results.pensionAgeSnapshot && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => {
                    const newSet = new Set(expandedMilestones);
                    if (newSet.has('pension-age')) {
                      newSet.delete('pension-age');
                    } else {
                      newSet.add('pension-age');
                    }
                    setExpandedMilestones(newSet);
                  }}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-bold text-gray-900">Your Financial Position at Pension Age</h3>
                  <span className={`text-xl transition-transform ${expandedMilestones.has('pension-age') ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedMilestones.has('pension-age') && (
                  <div className="px-6 pb-6 border-t border-gray-200">
                    <MilestoneSummary 
                      snapshot={results.pensionAgeSnapshot} 
                      title="Your Financial Position at Pension Age" 
                      ageLabel="Pension Age"
                    />
                  </div>
                )}
              </div>
            )}
            
            <Suspense fallback={<div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">Loading chart...</div>}>
              <PortfolioChart results={results} />
            </Suspense>
            <ResultsTable results={results} />
            
            {/* Tax Summary Section */}
            {taxCalculationResult && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => setTaxBreakdownExpanded(!taxBreakdownExpanded)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-bold text-gray-900">Irish Tax Breakdown</h3>
                  <span className={`text-xl transition-transform ${taxBreakdownExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {taxBreakdownExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-200">
                    <TaxSummary result={taxCalculationResult} showDetail={true} bonusTaxBurden={bonusTaxBurden} bonusPercent={bonusPercent} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-24 pt-12 border-t border-gray-200 text-center text-gray-600 text-sm">
          <p className="mb-2">
            ℹ️ This calculator is a helpful planning tool, not professional financial advice.
          </p>
          <p>
            Results are estimates based on your inputs. Actual outcomes may differ.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
