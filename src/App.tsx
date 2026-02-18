import { useState, lazy, Suspense } from 'react';
import InputForm from './components/InputForm';
import AccountSummary from './components/AccountSummary';
import MilestoneSummary from './components/MilestoneSummary';
import ResultsTable from './components/ResultsTable';
import TaxSummary from './components/TaxSummary';
import { PortfolioInputs, PortfolioResults, TaxCalculationResult } from './types';
import { calculatePortfolioGrowth } from './utils/calculations';
import { calculateNetSalary, calculateBonusTaxBurden } from './utils/taxCalculations';

const PortfolioChart = lazy(() => import('./components/PortfolioChart'));

function App() {
  const [results, setResults] = useState<PortfolioResults | null>(null);
  const [taxCalculationResult, setTaxCalculationResult] = useState<TaxCalculationResult | null>(null);
  const [bonusTaxBurden, setBonusTaxBurden] = useState<number>(0);
  const [bonusPercent, setBonusPercent] = useState<number>(0);

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
      inputs.useSalaryReplacementForPension,
      inputs.bonusPercent,
      inputs.houseWithdrawalAge,
      inputs.enableHouseWithdrawal,
      inputs.houseDepositPercent,
      inputs.houseDepositFromBrokerageRate,
      inputs.enablePensionLumpSum,
      inputs.taxInputs,
      inputs.pensionLumpSumAge
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
            Portfolio Projections
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Advanced financial planning tool. Project your wealth growth across multiple investment accounts with precision.
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
                <span>📊</span> Your Projections
              </h2>
            </div>
            <AccountSummary results={results} />
            
            {/* Milestone Summaries */}
            {results.earlyRetirementSnapshot && (
              <MilestoneSummary 
                snapshot={results.earlyRetirementSnapshot} 
                title="Early Retirement Milestone" 
                ageLabel="Early Retirement"
              />
            )}
            
            {results.pensionAgeSnapshot && (
              <MilestoneSummary 
                snapshot={results.pensionAgeSnapshot} 
                title="Pension Age Milestone" 
                ageLabel="Pension Age"
              />
            )}
            
            <Suspense fallback={<div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">Loading chart...</div>}>
              <PortfolioChart results={results} />
            </Suspense>
            <ResultsTable results={results} />
            
            {/* Tax Summary Section */}
            {taxCalculationResult && (
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">💰</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Tax Calculation (Ireland)</h2>
                    <p className="text-sm text-gray-600">Your net salary based on Irish tax laws</p>
                  </div>
                </div>
                <TaxSummary result={taxCalculationResult} showDetail={true} bonusTaxBurden={bonusTaxBurden} bonusPercent={bonusPercent} />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-24 pt-12 border-t border-gray-200 text-center text-gray-600 text-sm">
          <p className="mb-2">
            ⚠️ This is an educational calculator demonstrating compound interest and financial projections.
          </p>
          <p>
            Results are estimates based on your inputs and do not constitute professional financial advice.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
